#!/bin/bash

echo "🧹 Cleaning up unnecessary documentation files..."

# Create a docs_backup folder first (in case you need anything later)
mkdir -p docs_backup

# Essential files to KEEP
KEEP_FILES=(
    "README.md"
    "NEXT_STEPS.md"
    "FINAL_TESTING_SOLUTION.md"
    "SIMULATION_TESTING_EXPLAINED.md"
)

# Move all .md and .txt files to backup first
echo "📦 Backing up all documentation files..."
for file in *.md *.txt; do
    if [ -f "$file" ]; then
        # Check if it's NOT in the keep list
        keep=false
        for keep_file in "${KEEP_FILES[@]}"; do
            if [ "$file" = "$keep_file" ]; then
                keep=true
                break
            fi
        done
        
        if [ "$keep" = false ]; then
            mv "$file" docs_backup/
            echo "  Moved: $file"
        else
            echo "  ✅ Kept: $file"
        fi
    fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  - Essential files kept: ${#KEEP_FILES[@]}"
echo "  - Files backed up: $(ls docs_backup/*.md docs_backup/*.txt 2>/dev/null | wc -l)"
echo "  - Backup location: ./docs_backup/"
echo ""
echo "💡 To restore a file: mv docs_backup/FILENAME.md ."
echo "💡 To delete backup permanently: rm -rf docs_backup/"
