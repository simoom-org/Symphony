import zipfile
import re
import os
import xml.etree.ElementTree as ET

epub_path = r"C:\Users\tufae\Downloads\তাহারাত.epub"

with open("epub_meta_check.txt", "w", encoding="utf-8") as out:
    if not os.path.exists(epub_path):
        out.write("Error: File does not exist at " + epub_path)
        exit(1)

    with zipfile.ZipFile(epub_path, 'r') as archive:
        container_xml = archive.read('META-INF/container.xml')
        root = ET.fromstring(container_xml)
        opf_path = root.find('.//{urn:oasis:names:tc:opendocument:xmlns:container}rootfile').get('full-path')
        
        opf_content = archive.read(opf_path).decode('utf-8')
        out.write("--- ALL METADATA (content.opf) ---\n")
        
        tags = re.findall(r'<dc:([^>]+)>(.*?)</dc:(?:[^>]+)>', opf_content)
        for tag, value in tags:
            out.write(f"dc:{tag} -> {value}\n")
