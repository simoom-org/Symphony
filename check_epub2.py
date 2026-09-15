import zipfile
import re
import os
import xml.etree.ElementTree as ET

epub_path = r"C:\Users\tufae\Downloads\তাহারাত.epub"

with open("epub_meta.txt", "w", encoding="utf-8") as out:
    if not os.path.exists(epub_path):
        out.write("Error: File does not exist at " + epub_path)
        exit(1)

    with zipfile.ZipFile(epub_path, 'r') as archive:
        container_xml = archive.read('META-INF/container.xml')
        root = ET.fromstring(container_xml)
        opf_path = root.find('.//{urn:oasis:names:tc:opendocument:xmlns:container}rootfile').get('full-path')
        
        opf_content = archive.read(opf_path).decode('utf-8')
        out.write("--- METADATA (content.opf) ---\n")
        
        tags = re.findall(r'<dc:([^>]+)>(.*?)</dc:(?:[^>]+)>', opf_content)
        for tag, value in tags:
            clean_tag = tag.split()[0]
            out.write(f"{clean_tag}: {value}\n")

        out.write("\n--- CHECKING TITLE PAGE FOR ORIGINAL NAME ---\n")
        title_page = None
        for name in archive.namelist():
            if 'title' in name.lower() and name.endswith('.xhtml'):
                title_page = archive.read(name).decode('utf-8')
                break
        
        if title_page:
            match = re.search(r'Original Name:\s*([^<]+)', title_page)
            if match:
                out.write(f"Original Name (in Title Page HTML): {match.group(1).strip()}\n")
            else:
                out.write("Original Name not found in Title Page HTML.\n")
        else:
            out.write("Title page not found.\n")
