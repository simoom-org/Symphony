import zipfile
import re
import os
import xml.etree.ElementTree as ET

epub_path = r"C:\Users\tufae\Downloads\তাহারাত.epub"

if not os.path.exists(epub_path):
    print("Error: File does not exist at " + epub_path)
    exit(1)

with zipfile.ZipFile(epub_path, 'r') as archive:
    # Find the OPF file
    container_xml = archive.read('META-INF/container.xml')
    root = ET.fromstring(container_xml)
    opf_path = root.find('.//{urn:oasis:names:tc:opendocument:xmlns:container}rootfile').get('full-path')
    
    # Read the OPF file
    opf_content = archive.read(opf_path).decode('utf-8')
    print("--- METADATA (content.opf) ---")
    
    # Print all dc: tags
    tags = re.findall(r'<dc:([^>]+)>(.*?)</dc:\1>', opf_content)
    for tag, value in tags:
        # tag might have attributes like creator opf:role="aut"
        clean_tag = tag.split()[0]
        print(f"{clean_tag}: {value}")

    print("\n--- CHECKING TITLE PAGE FOR ORIGINAL NAME ---")
    # Read the title page (usually OEBPS/title_page.xhtml or similar)
    title_page = None
    for name in archive.namelist():
        if 'title' in name.lower() and name.endswith('.xhtml'):
            title_page = archive.read(name).decode('utf-8')
            break
    
    if title_page:
        # Check for Original Name
        match = re.search(r'Original Name:\s*([^<]+)', title_page)
        if match:
            print(f"Original Name (in Title Page HTML): {match.group(1).strip()}")
        else:
            print("Original Name not found in Title Page HTML.")
    else:
        print("Title page not found.")
