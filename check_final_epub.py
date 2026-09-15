import zipfile
import re
import os
import xml.etree.ElementTree as ET

epub_path = r"C:\Users\tufae\Downloads\তাহারাত.epub"

with open("epub_meta_final_check.txt", "w", encoding="utf-8") as out:
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

        out.write("\n--- TITLE PAGE (title-page.xhtml) ---\n")
        # Check for title page
        try:
            title_page_content = archive.read('OEBPS/title-page.xhtml').decode('utf-8')
            # Just extract text inside <body>
            body_match = re.search(r'<body>(.*?)</body>', title_page_content, re.DOTALL)
            if body_match:
                out.write(body_match.group(1).strip() + "\n")
            else:
                out.write("No <body> tag found in title page.\n")
        except KeyError:
            out.write("ERROR: title-page.xhtml not found in OEBPS/\n")
            # Let's list files just in case it's in the root
            for name in archive.namelist():
                if 'title-page' in name:
                    out.write(f"Found it at: {name}\n")
                    out.write(archive.read(name).decode('utf-8')[:500])
