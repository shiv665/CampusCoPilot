"""
CampusCoPilot – Llama Client for Azure AI Foundry
Sends chat-completion requests to the deployed Llama model.
Tracks token usage to protect the $100 budget.
"""

from __future__ import annotations
import json
import logging
from typing import Any, Dict, List, Optional

import httpx

from backend.config import (
    AZURE_AI_API_KEY,
    AZURE_AI_DEPLOYMENT,
    AZURE_AI_ENDPOINT,
    AZURE_AI_PROJECT,
    AZURE_API_VERSION,
    MAX_INPUT_TOKENS,
    MAX_OUTPUT_TOKENS,
    TEMPERATURE,
)

logger = logging.getLogger("campuscopilot.llama")

# ── Cumulative token tracker (in-memory for MVP) ────────────────────
_usage: Dict[str, int] = {"prompt_tokens": 0, "completion_tokens": 0}


def get_token_usage() -> Dict[str, int]:
    return {**_usage, "total": _usage["prompt_tokens"] + _usage["completion_tokens"]}


async def chat_completion(
    messages: List[Dict[str, str]],
    *,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    Send a chat-completion request to the Azure-hosted Llama model.

    Parameters
    ----------
    messages : list of {"role": "system"|"user"|"assistant", "content": str}
    temperature : override default temperature
    max_tokens  : override default max output tokens
    response_format : set to "json_object" to request structured JSON

    Returns
    -------
    The assistant's reply as a plain string.
    """
    if not AZURE_AI_ENDPOINT or not AZURE_AI_API_KEY:
        raise RuntimeError(
            "AZURE_AI_ENDPOINT and AZURE_AI_API_KEY must be set in .env"
        )

    # Build URL based on endpoint type
    base = AZURE_AI_ENDPOINT.rstrip("/")
    if base.endswith("/models") or "services.ai.azure.com/models" in base:
        # Azure AI Inference models endpoint
        url = f"{base}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "api-key": AZURE_AI_API_KEY,
        }
    elif "models.ai.azure.com" in base:
        # Serverless MaaS deployment – /v1/chat/completions + Bearer
        url = f"{base}/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {AZURE_AI_API_KEY}",
        }
    else:
        # Standard Azure OpenAI format (works with openai.azure.com)
        url = f"{base}/openai/deployments/{AZURE_AI_DEPLOYMENT}/chat/completions?api-version={AZURE_API_VERSION}"
        headers = {
            "Content-Type": "application/json",
            "api-key": AZURE_AI_API_KEY,
        }

    body: Dict[str, Any] = {
        "messages": messages,
        "temperature": temperature if temperature is not None else TEMPERATURE,
        "max_tokens": max_tokens or MAX_OUTPUT_TOKENS,
    }

    # Azure AI Inference requires 'model' inside the body
    if base.endswith("/models") or "services.ai.azure.com/models" in base:
        body["model"] = AZURE_AI_DEPLOYMENT
        # model_extras/agent_reference is not supported natively via raw REST without SDK translation, causing 400 Bad Request.

    if response_format == "json_object":
        body["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, headers=headers, json=body)

        if resp.status_code == 429:
            logger.warning("Rate-limited (429). Consider slowing down requests.")
            raise RuntimeError("Azure rate limit hit – retry after cooldown.")

        resp.raise_for_status()

    data = resp.json()

    # Track token usage
    usage = data.get("usage", {})
    _usage["prompt_tokens"] += usage.get("prompt_tokens", 0)
    _usage["completion_tokens"] += usage.get("completion_tokens", 0)
    logger.info(
        "Tokens this call: prompt=%s completion=%s | Running total: %s",
        usage.get("prompt_tokens", "?"),
        usage.get("completion_tokens", "?"),
        get_token_usage(),
    )

    return data["choices"][0]["message"]["content"]


def repair_truncated_json(s: str) -> Optional[str]:
    """Attempt to close open brackets/braces in a truncated JSON string."""
    # Strip trailing partial values (incomplete strings, numbers, etc.)
    trimmed = s.rstrip()
    # Remove trailing incomplete key-value (e.g. '"day": "' -> cut back to last complete entry)
    import re as _re
    # Remove any trailing partial string value
    trimmed = _re.sub(r',?\s*"[^"]*"\s*:\s*"[^"]*$', '', trimmed)
    # Remove trailing comma
    trimmed = trimmed.rstrip().rstrip(',')
    # Count open brackets
    stack = []
    in_string = False
    escape = False
    for ch in trimmed:
        if escape:
            escape = False
            continue
        if ch == '\\':
            if in_string:
                escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in ('{', '['):
            stack.append(ch)
        elif ch == '}':
            if stack and stack[-1] == '{':
                stack.pop()
        elif ch == ']':
            if stack and stack[-1] == '[':
                stack.pop()
    # Close open brackets in reverse order
    closers = [']' if c == '[' else '}' for c in reversed(stack)]
    if not closers:
        return None  # wasn't a bracket issue
    repaired = trimmed + ''.join(closers)
    try:
        json.loads(repaired)
        return repaired
    except json.JSONDecodeError:
        return None


async def chat_completion_json(
    messages: List[Dict[str, str]],
    **kwargs,
) -> Any:
    """
    Convenience wrapper: calls chat_completion and parses the result as JSON.
    Falls back to raw string if JSON decoding fails.
    """
    raw = await chat_completion(
        messages, response_format="json_object", **kwargs
    )
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        # Sometimes models wrap JSON in markdown code fences
        import re
        match = re.search(r"```(?:json)?\s*([\s\S]+?)```", raw)
        if match:
            try:
                result = json.loads(match.group(1))
            except json.JSONDecodeError:
                result = None
        else:
            result = None

        if result is None:
            # Try repairing truncated JSON
            repaired = repair_truncated_json(raw)
            if repaired:
                logger.info("Repaired truncated JSON (%d open brackets closed)", len(raw) - len(repaired.rstrip('}]'))  + 1)
                result = json.loads(repaired)
            else:
                logger.warning("Could not parse JSON from Llama response, returning raw text.")
                return raw

    # Recursively unwrap if model double/triple-stringified the JSON
    for _ in range(3):
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except (json.JSONDecodeError, TypeError):
                break
        else:
            break

    logger.info("chat_completion_json final type: %s", type(result).__name__)
    return result
