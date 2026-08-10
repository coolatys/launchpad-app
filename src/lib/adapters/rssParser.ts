export interface ParsedRssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
}

/**
 * Extracts content within XML tags, removing CDATA wrappers if present.
 */
function extractTagContent(xmlBlock: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([^]*?)<\/${tagName}>`, 'i');
  const match = xmlBlock.match(regex);
  if (!match) return '';
  
  let content = match[1].trim();
  
  // Clean CDATA wrapper if it exists: <![CDATA[ content ]]>
  if (content.startsWith('<![CDATA[')) {
    content = content.substring(9);
    if (content.endsWith(']]>')) {
      content = content.substring(0, content.length - 3);
    }
  }
  
  return content.trim();
}

/**
 * Extracts a link for Atom feed format where link is often a self-closing tag with href attribute.
 */
function extractAtomLink(xmlBlock: string): string {
  const match = xmlBlock.match(/<link\s+[^>]*href=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

/**
 * A lightweight, dependency-free XML parser for RSS and Atom feeds using regular expressions.
 */
export function parseRssXml(xmlText: string): ParsedRssItem[] {
  const items: ParsedRssItem[] = [];

  // Determine if it is RSS or Atom
  const isAtom = xmlText.includes('<entry');
  const itemTag = isAtom ? 'entry' : 'item';
  
  const itemRegex = new RegExp(`<${itemTag}[^>]*>([^]*?)<\/${itemTag}>`, 'gi');
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const block = match[1];
    
    const title = extractTagContent(block, 'title');
    let link = extractTagContent(block, 'link');
    
    // Fallback for self-closing link tag (typical in Atom feeds)
    if (!link && isAtom) {
      link = extractAtomLink(block);
    }
    
    let description = extractTagContent(block, 'description') || 
                      extractTagContent(block, 'summary') || 
                      extractTagContent(block, 'content');
                      
    // Remove any HTML tags from description
    description = description.replace(/<\/?[^>]+(>|$)/g, "");

    const pubDate = extractTagContent(block, 'pubDate') || 
                    extractTagContent(block, 'updated') || 
                    extractTagContent(block, 'dc:date') || 
                    'N/A';
                    
    const guid = extractTagContent(block, 'guid') || 
                 extractTagContent(block, 'id') || 
                 link || 
                 Math.random().toString(36).substr(2, 9);

    if (title && link) {
      items.push({
        title,
        link,
        description: description || 'No details provided.',
        pubDate,
        guid,
      });
    }
  }

  return items;
}
