#!/bin/bash
while read -r line; do
  allowed_files+=("$line")
done < allowed.list

echo "Allowed files: ${allowed_files[*]}"

for file in *.json; do
  echo "Checking file: $file"
  if ! printf '%s\n' "${allowed_files[@]}" | grep -q -x "$file"; then
    echo "Removing file: $file"
    rm "$file"
  fi
done