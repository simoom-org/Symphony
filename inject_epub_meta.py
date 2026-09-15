import os

with open('src/utils/epubExporter.ts', 'r', encoding='utf-8') as f:
    content = f.read()

import re
pattern = r"<dc:title>\$\{escapeXml\(title\)\}</dc:title>\s*\$\{dcCreators\}\s*\$\{dcSubjects \? '    ' \+ dcSubjects : ''\}\s*\$\{dcTranslators \? '    ' \+ dcTranslators : ''\}"

replacement = """<dc:title>${escapeXml(title)}</dc:title>
    ${project.metadata.originalTitle ? `<dc:title id="original-title">${escapeXml(project.metadata.originalTitle)}</dc:title>` : ''}
    ${dcCreators}
    ${dcSubjects ? dcSubjects : ''}
    ${dcTranslators ? dcTranslators : ''}
    ${dcGenre ? dcGenre : ''}
    ${project.metadata.publisherName ? `<dc:publisher>${escapeXml(project.metadata.publisherName)}</dc:publisher>` : ''}
    ${project.metadata.publicationDate ? `<dc:date>${escapeXml(project.metadata.publicationDate)}</dc:date>` : ''}
    ${project.metadata.isbn ? `<dc:identifier opf:scheme="ISBN">${escapeXml(project.metadata.isbn)}</dc:identifier>` : ''}
    ${project.metadata.copyrightInfo ? `<dc:rights>${escapeXml(project.metadata.copyrightInfo)}</dc:rights>` : ''}
    ${project.metadata.license ? `<dc:rights>${escapeXml(project.metadata.license)}</dc:rights>` : ''}
    ${project.metadata.description ? `<dc:description>${escapeXml(project.metadata.description)}</dc:description>` : ''}"""

new_content = re.sub(pattern, replacement, content)

with open('src/utils/epubExporter.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)