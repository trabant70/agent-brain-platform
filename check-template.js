const fs = require('fs');
const template = JSON.parse(fs.readFileSync('.agent-brain/templates/threading-system-template-v2.json', 'utf8'));

// Check required template fields
const requiredFields = ['id', 'name', 'description', 'version', 'category', 'author', 'license', 'items'];
const missing = requiredFields.filter(f => !template[f]);

console.log('Missing required template fields:', missing.length > 0 ? missing : 'None');
console.log('Item count:', template.items?.length || 0);
console.log('Has createdAt:', !!template.createdAt);
console.log('Has updatedAt:', !!template.updatedAt);

// Check first item structure
if (template.items && template.items.length > 0) {
  const item = template.items[0];
  const requiredItemFields = ['id', 'type', 'scope', 'title', 'body', 'tags', 'path', 'relativePath', 'valid', 'metadata'];
  const missingItem = requiredItemFields.filter(f => !item[f] && f !== 'tags');
  console.log('First item missing fields:', missingItem.length > 0 ? missingItem : 'None');
  console.log('First item has metadata.createdAt:', !!item.metadata?.createdAt);
  console.log('First item has metadata.updatedAt:', !!item.metadata?.updatedAt);
  console.log('First item tags array:', Array.isArray(item.tags), item.tags?.length || 0);
}
