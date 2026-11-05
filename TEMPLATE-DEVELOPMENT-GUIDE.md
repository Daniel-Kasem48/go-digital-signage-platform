# Digital Signage Template Development Guide

This guide provides comprehensive instructions for creating, uploading, and using templates in the Digital Signage system.

## Table of Contents
1. [Template Structure](#template-structure)
2. [Creating a Template](#creating-a-template)
3. [Uploading Templates](#uploading-templates)
4. [Creating Content from Templates](#creating-content-from-templates)
5. [Publishing Content](#publishing-content)
6. [Troubleshooting](#troubleshooting)

---

## Template Structure

### Required Files
Every template must contain these files **at the root level** (not in subdirectories):

```
template.zip
├── index.html       # Main template HTML file
├── styles.css       # Template styling
├── script.js        # Template JavaScript logic
└── schema.json      # Template configuration schema
```

### Critical Requirements
- ✅ **All files must be at the ZIP root level** (not in subdirectories)
- ✅ **schema.json is required** for content creation to work
- ✅ **index.html must be the main entry point**
- ✅ **JavaScript must fetch model.json dynamically**

---

## Creating a Template

### 1. HTML Structure (index.html)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Template</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1 id="title">Default Title</h1>
        <p id="message">Default Message</p>
        <button id="cta">Default CTA</button>
    </div>
    
    <script src="script.js"></script>
</body>
</html>
```

### 2. JavaScript Logic (script.js)
**CRITICAL: Must fetch model.json dynamically**

```javascript
class TemplateController {
    constructor() {
        this.loadModel();
    }

    async loadModel() {
        try {
            // Fetch dynamic data from the system
            const response = await fetch('./model.json');
            const modelData = await response.json();
            this.updateContent(modelData);
        } catch (error) {
            console.error('Error loading model.json:', error);
            // Use default values from schema
            this.loadDefaults();
        }
    }

    updateContent(data) {
        // Update DOM elements with data from model.json
        document.getElementById('title').textContent = data.title || 'Default Title';
        document.getElementById('message').textContent = data.message || 'Default Message';
        document.getElementById('cta').textContent = data.call_to_action || 'Default CTA';
    }

    loadDefaults() {
        // Fallback to hardcoded defaults if model.json fails
        this.updateContent({
            title: 'Default Title',
            message: 'Default Message', 
            call_to_action: 'Default CTA'
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TemplateController();
});
```

### 3. CSS Styling (styles.css)
```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    background: #f0f0f0;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.container {
    background: white;
    padding: 40px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    max-width: 600px;
}

#title {
    font-size: 2.5em;
    margin-bottom: 20px;
    color: #333;
}

#message {
    font-size: 1.2em;
    margin-bottom: 30px;
    line-height: 1.6;
    color: #666;
}

#cta {
    background: #007bff;
    color: white;
    border: none;
    padding: 15px 30px;
    font-size: 1.1em;
    border-radius: 5px;
    cursor: pointer;
    transition: background 0.3s;
}

#cta:hover {
    background: #0056b3;
}
```

### 4. Schema Configuration (schema.json)
**CRITICAL: Must follow exact format with "schema" wrapper**

```json
{
  "name": "Your Template Name",
  "description": "Description of what your template does",
  "version": "1.0.0",
  "schema": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "default": "Welcome"
      },
      "message": {
        "type": "string", 
        "default": "Your message here"
      },
      "call_to_action": {
        "type": "string",
        "default": "Click Here"
      },
      "background_color": {
        "type": "string",
        "default": "#ffffff"
      },
      "text_color": {
        "type": "string",
        "default": "#333333"
      }
    }
  }
}
```

**Schema Requirements:**
- ✅ Must have `"schema"` wrapper object
- ✅ Each property must have `"type"` field
- ✅ Each property must have `"default"` value
- ✅ Supported types: `"string"`, `"number"`, `"boolean"`

---

## Uploading Templates

### 1. Create Zip File
**CRITICAL: Files must be at root level, not in subdirectories**

```bash
# CORRECT - Files at root level
cd your-template-directory
zip -r template-name.zip index.html styles.css script.js schema.json

# INCORRECT - Files in subdirectory (will fail schema extraction)
zip -r template-name.zip template-directory/
```

### 2. Upload via Script
```bash
# Use the upload script
./upload-template.sh "Template Name" path/to/template.zip

# With thumbnail (optional)
./upload-template.sh "Template Name" path/to/template.zip path/to/thumbnail.png
```

### 3. Upload via API
```bash
# Step 1: Upload template file
TEMPLATE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  -F "file=@template.zip" \
  "http://localhost:8080/api/files")

STORAGE_KEY=$(echo "$TEMPLATE_RESPONSE" | jq -r '.key')

# Step 2: Create template record
curl -X POST \
  -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Template Name",
    "storageKey": "'$STORAGE_KEY'"
  }' \
  "http://localhost:8080/api/templates"
```

### 4. Verify Upload
```bash
# Check that schema was extracted successfully
curl -s -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  "http://localhost:8080/api/templates" | jq '.[] | select(.name=="Your Template Name")'
```

**Expected Result:**
- `schema` field should be populated (not null)
- `storage_key` should point to uploaded file

---

## Creating Content from Templates

### 1. Get Template ID
```bash
# List templates to find the ID
curl -s -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  "http://localhost:8080/api/templates" | jq -r '.[] | "\(.id) - \(.name)"'
```

### 2. Create Content
**CRITICAL: Use exact model format with "schema" wrapper**

```bash
curl -X POST \
  -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Content Instance",
    "content_type": "template",
    "template_id": "YOUR_TEMPLATE_ID",
    "model": {
      "schema": {
        "properties": {
          "title": {"default": "Custom Title"},
          "message": {"default": "Custom Message"},
          "call_to_action": {"default": "Custom Button"},
          "background_color": {"default": "#ff0000"},
          "text_color": {"default": "#ffffff"}
        }
      }
    }
  }' \
  "http://localhost:8080/api/contents"
```

**Model Format Requirements:**
- ✅ Must wrap properties in `"model": { "schema": { "properties": {} } }`
- ✅ Each property must have `{"default": "value"}` format
- ✅ Property names must match those defined in template's schema.json

### 3. Verify Content Creation
```bash
# List contents to verify creation
curl -s -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  "http://localhost:8080/api/contents" | jq '.data[] | select(.name=="My Content Instance")'
```

---

## Publishing Content

### 1. Create Channel (if needed)
```bash
curl -X POST \
  -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Channel",
    "description": "Channel description"
  }' \
  "http://localhost:8080/api/channels"
```

### 2. Create Layout
```bash
curl -X POST \
  -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Full Screen Layout",
    "zones": [{
      "id": "main",
      "type": "content", 
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 100,
      "zIndex": 1
    }]
  }' \
  "http://localhost:8080/api/layouts"
```

### 3. Create Playlist
```bash
curl -X POST \
  -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Playlist",
    "layoutId": "LAYOUT_ID"
  }' \
  "http://localhost:8080/api/playlists"
```

### 4. Add Content to Playlist  
```bash
curl -X POST \
  -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  -H "Content-Type: application/json" \
  -d '{
    "layoutPosition": 1,
    "timestring": "10s",
    "isActive": true,
    "contentId": "CONTENT_ID",
    "playlistId": "PLAYLIST_ID"
  }' \
  "http://localhost:8080/api/playlist-items"
```

### 5. Assign Channel to Device
```bash
curl -X POST \
  -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  -H "Content-Type: application/json" \
  -d '{
    "device_ids": ["DEVICE_ID"]
  }' \
  "http://localhost:8080/api/channels/CHANNEL_ID/publish"
```

---

## Troubleshooting

### Common Issues

#### 1. Schema Not Extracted (schema: null)
**Problem:** Template shows `"schema": null` after upload

**Causes:**
- ❌ Files are in subdirectory instead of root level
- ❌ schema.json is missing
- ❌ Invalid JSON in schema.json

**Solution:**
```bash
# Check zip structure - files should be at root
unzip -l template.zip

# CORRECT structure:
#   index.html
#   styles.css  
#   script.js
#   schema.json

# INCORRECT structure:
#   template-folder/
#   template-folder/index.html
#   template-folder/styles.css
#   ...
```

#### 2. Content Creation Fails ("Invalid input")
**Problem:** Getting `{"error": "Invalid input"}` when creating content

**Causes:**
- ❌ Wrong model format (missing "schema" wrapper)
- ❌ Template ID doesn't exist
- ❌ Missing required fields
- ❌ Invalid property names

**Solution:**
```bash
# Verify template exists and has schema
curl -s -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  "http://localhost:8080/api/templates/TEMPLATE_ID"

# Use exact model format
{
  "model": {
    "schema": {
      "properties": {
        "field_name": {"default": "value"}
      }
    }
  }
}
```

#### 3. Template Not Displaying Data
**Problem:** Template loads but shows default values instead of custom data

**Causes:**
- ❌ JavaScript not fetching model.json
- ❌ model.json endpoint not working
- ❌ Property names don't match

**Solution:**
```javascript
// Ensure JavaScript fetches model.json
async loadModel() {
    try {
        const response = await fetch('./model.json');
        const modelData = await response.json();
        console.log('Loaded model:', modelData); // Debug
        this.updateContent(modelData);
    } catch (error) {
        console.error('Model loading failed:', error);
    }
}
```

#### 4. WebSocket Events Not Triggering
**Problem:** Devices not receiving content updates

**Solution:**
```bash
# Ensure channel is published to devices
curl -X POST \
  -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  -H "Content-Type: application/json" \
  -d '{"device_ids": ["DEVICE_ID"]}' \
  "http://localhost:8080/api/channels/CHANNEL_ID/publish"
```

### Debug Commands

```bash
# Check template schema extraction
curl -s -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  "http://localhost:8080/api/templates" | jq '.[] | {id, name, schema}'

# Decode base64 schema
echo "BASE64_SCHEMA" | base64 -d | jq

# Test content creation with minimal data
curl -X POST \
  -H "Authorization: Basic $(echo -n 'backend_user:backend_password' | base64)" \
  -H "X-Tenant-ID: test_schema" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "content_type": "template",
    "template_id": "TEMPLATE_ID", 
    "model": {
      "schema": {
        "properties": {
          "title": {"default": "Test"}
        }
      }
    }
  }' \
  "http://localhost:8080/api/contents"

# Check content model.json endpoint
curl -s -H "X-Tenant-ID: test_schema" \
  "http://localhost:8080/cloud/contents/CONTENT_ID/model.json"
```

---

## Best Practices

### Template Development
1. **Always test locally** before uploading
2. **Use fallback values** in JavaScript for offline testing  
3. **Keep schema.json properties minimal** - add only what you need
4. **Use semantic property names** that match your HTML element IDs
5. **Include error handling** in JavaScript for model.json loading

### File Organization
1. **Keep templates in version control**
2. **Use meaningful file names**
3. **Document template purpose and usage**
4. **Test zip structure before upload**

### Content Management
1. **Use descriptive content names**
2. **Test content creation before publishing**
3. **Verify WebSocket events are triggered**
4. **Monitor device connectivity**

---

## Example: Complete Promotional Template

See the working promotional template in `/sample-templates/promotional-template/` for a complete example that demonstrates:

- ✅ Proper file structure
- ✅ Dynamic model.json loading
- ✅ Correct schema.json format
- ✅ Advanced CSS animations
- ✅ Interactive JavaScript features
- ✅ Content creation and publishing

Template ID: `81ccff0f-2c17-4377-8657-b5edf7a0fe43`

This template successfully creates content and can be published to channels for device display.