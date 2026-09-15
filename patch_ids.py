import os
import re

with open('src/utils/epubExporter.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Description and Subtitle
content = content.replace(
    '${project.metadata.subtitle ? `<dc:description>${escapeXml(project.metadata.subtitle)}</dc:description>` : \'\'}',
    '${project.metadata.subtitle ? `<dc:description id="subtitle">${escapeXml(project.metadata.subtitle)}</dc:description>` : \'\'}'
)

content = content.replace(
    '${project.metadata.description ? `<dc:description>${escapeXml(project.metadata.description)}</dc:description>` : \'\'}',
    '${project.metadata.description ? `<dc:description id="description">${escapeXml(project.metadata.description)}</dc:description>` : \'\'}'
)

# Fix Copyright and License
content = content.replace(
    '${project.metadata.copyrightInfo ? `<dc:rights>${escapeXml(project.metadata.copyrightInfo)}</dc:rights>` : \'\'}',
    '${project.metadata.copyrightInfo ? `<dc:rights id="copyright">${escapeXml(project.metadata.copyrightInfo)}</dc:rights>` : \'\'}'
)

content = content.replace(
    '${project.metadata.license ? `<dc:rights>${escapeXml(project.metadata.license)}</dc:rights>` : \'\'}',
    '${project.metadata.license ? `<dc:rights id="license">${escapeXml(project.metadata.license)}</dc:rights>` : \'\'}'
)

with open('src/utils/epubExporter.ts', 'w', encoding='utf-8') as f:
    f.write(content)
