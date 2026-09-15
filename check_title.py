import zipfile

epub_path = r"C:\Users\tufae\Downloads\তাহারাত.epub"

with open("title_meta.txt", "w", encoding="utf-8") as out:
    with zipfile.ZipFile(epub_path, 'r') as archive:
        for name in archive.namelist():
            if 'title' in name.lower():
                content = archive.read(name).decode('utf-8')
                out.write(f"--- {name} ---\n")
                out.write(content)