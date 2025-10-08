# Spreadsheet Structure Example

## Lesson Database Sheet

This is the exact structure the code expects:

### Headers (Row 1):
| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Lesson Title | Lesson Description | Image 1 Description | Image 1 URL | Image 1 Zones | Image 2 Description | Image 2 URL | Image 2 Zones | Image 3 Description | Image 3 URL | Image 3 Zones |

### Example Data (Row 2):
| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| Cell Structure | Learn about plant cells | Overview of cell | https://drive.google.com/file/d/ABC123/view | [{"x":10,"y":20,"width":15,"height":15,"label":"Nucleus"}] | Nucleus close-up | https://drive.google.com/file/d/DEF456/view | [{"x":25,"y":30,"width":20,"height":20,"label":"Nuclear pore"}] |

## Admin Sheet

Simple username/password storage:

### Headers (Row 1):
| A | B |
|---|---|
| Username | Password |

### Example Data:
| A | B |
|---|---|
| teacher1 | securepass123 |
| admin | adminpass456 |

## Important Notes

1. **Column Pattern**: Each image uses 3 columns (Description, URL, Zones)
2. **Image Indexing**:
   - Image 1 = Columns C, D, E (index 0 in code)
   - Image 2 = Columns F, G, H (index 1 in code)
   - Image 3 = Columns I, J, K (index 2 in code)

3. **Zones Format**: Must be valid JSON array:
   ```json
   [
     {
       "x": 10.5,
       "y": 20.3,
       "width": 15.2,
       "height": 12.8,
       "label": "Mitochondria"
     }
   ]
   ```

4. **URLs**: Can be standard Drive share links - code auto-converts to thumbnail format

5. **Lesson Description vs Image Description**:
   - Column B = Description of the entire lesson (shows on lesson card)
   - Column C, F, I... = Description of each individual image (shows during simulation)

## Code Column Mapping

```javascript
// For image at index 0:
baseColumn = 3 + (0 * 3) = 3 (Column C)
descColumn = 3 (Column C) ✓
urlColumn = 4 (Column D) ✓
zonesColumn = 5 (Column E) ✓

// For image at index 1:
baseColumn = 3 + (1 * 3) = 6 (Column F)
descColumn = 6 (Column F) ✓
urlColumn = 7 (Column G) ✓
zonesColumn = 8 (Column H) ✓
```
