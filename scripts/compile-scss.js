const sass = require('sass');
const { glob } = require('glob');
const fs = require('fs');
const path = require('path');

// Source and target directories as arguments
const srcFolder = process.argv[2] || 'src';
const targetFolder = process.argv[3] || 'lib';

// Function to compile SCSS file to CSS and copy it to the target folder
function compileSass(filePath, srcFolder, targetFolder) {
    sass.compileAsync(filePath)
        .then((result) => {
            // Calculate the relative path from the source folder to the SCSS file
            const relativePath = path.relative(srcFolder, filePath);
            // Replace the file extension and prepend the target folder
            const cssFilePath = path.join(
                targetFolder,
                relativePath.replace('.scss', '.css')
            );
            // Ensure the target directory exists
            const dirName = path.dirname(cssFilePath);
            if (!fs.existsSync(dirName)) {
                fs.mkdirSync(dirName, { recursive: true });
            }
            // Write the CSS file
            fs.writeFileSync(cssFilePath, result.css);
            console.log(`Compiled and moved ${filePath} to ${cssFilePath}`);
        })
        .catch((error) => {
            console.error(`Error compiling ${filePath}:`, error);
        });
}

// Find all SCSS files in the project within the source folder
async function compileAllScss() {
    try {
        const files = await glob(`${srcFolder}/**/*.scss`);

        if (files.length === 0) {
            console.log('No SCSS files found.');
            return;
        }

        files.forEach((file) => {
            compileSass(file, srcFolder, path.join(targetFolder, 'cjs'));
            compileSass(file, srcFolder, path.join(targetFolder, 'esm'));
        });
    } catch (err) {
        console.error('Error finding SCSS files:', err);
    }
}

compileAllScss();
