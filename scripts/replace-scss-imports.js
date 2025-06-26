const { glob } = require('glob');
const fs = require('fs');
const path = require('path');

// Get directory name from command line arguments, default to 'dist' if not provided
const directory = process.argv[2] || 'dist';

const replaceScssImports = async (directory, fileExtension) => {
    const pattern = path.join(directory, `**/*.${fileExtension}`);

    try {
        const files = await glob(pattern);

        files.forEach((file) => {
            let content = fs.readFileSync(file, 'utf8');
            // Replace .scss imports with .css
            content = content.replace(/\.scss/g, '.css');
            fs.writeFileSync(file, content, 'utf8');
        });
    } catch (err) {
        console.error('Failed to find files', err);
    }
};

// Adjust the pattern to match your output JavaScript files within the provided directory
async function replaceAllImports() {
    console.log('Replacing .scss imports with .css in JS files');
    await replaceScssImports(path.join(directory, 'cjs'), 'js');
    await replaceScssImports(path.join(directory, 'esm'), 'mjs');

    console.log('Replacing .scss imports with .css in .d.ts files');
    await replaceScssImports(path.join(directory, 'types'), 'd.ts');
}

replaceAllImports();
