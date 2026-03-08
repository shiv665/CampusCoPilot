import pypdf

pdf_path = r"c:\Users\SHIVANSH YADAV\Desktop\NEURIXIA\Neurixia Idea Submission.pdf"
out_path = r"c:\Users\SHIVANSH YADAV\Desktop\NEURIXIA\pdf_content.md"

try:
    reader = pypdf.PdfReader(pdf_path)
    text = ""
    for idx, page in enumerate(reader.pages):
        text += f"--- Page {idx+1} ---\n"
        text += page.extract_text() + "\n"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Done")
except Exception as e:
    print(f"Error reading PDF: {e}")
