import zipfile

epub_path = r"C:\Users\tufae\Downloads\তাহারাত.epub"
with zipfile.ZipFile(epub_path, 'r') as archive:
    for name in archive.namelist():
        print(name)