const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// Comprehensive emoji regex
const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23F3}\u{24C2}\u{23E9}-\u{23EF}\u{25B6}\u{23F8}-\u{23FA}]/gu;

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(srcDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // 1. Remove all emojis
    content = content.replace(emojiRegex, '');

    // 2. Make text darker since glass background is now white
    content = content.replace(/text-slate-200/g, 'text-slate-800');
    content = content.replace(/text-slate-300/g, 'text-slate-700');
    content = content.replace(/text-slate-400/g, 'text-slate-500');
    content = content.replace(/text-indigo-300/g, 'text-indigo-700');
    content = content.replace(/text-indigo-400/g, 'text-indigo-600');
    content = content.replace(/bg-slate-800/g, 'bg-slate-100');
    content = content.replace(/bg-slate-900/g, 'bg-slate-50');
    content = content.replace(/border-slate-800/g, 'border-slate-200');
    content = content.replace(/border-slate-700/g, 'border-slate-300');
    // For headings that might have been white
    content = content.replace(/text-white/g, 'text-slate-900');
    // Revert text-slate-900 back to text-white inside buttons (naive approach but handles most)
    content = content.replace(/bg-indigo-[56]00([^>]*)text-slate-900/g, 'bg-indigo-600$1text-white');
    content = content.replace(/bg-rose-[56]00([^>]*)text-slate-900/g, 'bg-rose-600$1text-white');
    content = content.replace(/bg-emerald-[56]00([^>]*)text-slate-900/g, 'bg-emerald-600$1text-white');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated: ${path.relative(__dirname, file)}`);
    }
});

console.log('UI updates complete!');
