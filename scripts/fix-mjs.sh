for mapfile in ./dist/esm/**/*.js.map; do
  echo "Updating $mapfile contents..."
  sed -i '' 's/\.js"/\.mjs"/g' "$mapfile"
  echo "Renaming $mapfile to ${mapfile%.js.map}.mjs.map..."
  mv "$mapfile" "${mapfile%.js.map}.mjs.map"
done

for file in ./dist/esm/**/*.js; do
  echo "Updating $file contents..."
  sed -i '' "s/\.js'/\.mjs'/g" "$file"
  echo "Renaming $file to ${file%.js}.mjs..."
  mv "$file" "${file%.js}.mjs"
done
