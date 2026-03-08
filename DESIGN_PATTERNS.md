# Design Patterns & Component Library

## 📐 Lessons Card Grid Pattern

This is the preferred layout for presenting skill-based content or multiple related options.

### Where Used
- `/src/pages/celpip/index.astro` — "Learn at Your Own Pace" section (Listening, Reading, Speaking, Writing cards)

### Color Palette
Each skill gets a unique color for visual distinction:
- **Listening**: `#8B7FFF` (Purple)
- **Reading**: `#FF6B6B` (Red)
- **Speaking**: `#FFD93D` (Gold)
- **Writing**: `#6BCB77` (Green)

### Key Features

#### Grid Layout
```astro
style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--s-4);"
```
- Responsive: stacks on mobile, flows on desktop
- Minimum card width: 280px
- Gap between cards: `var(--s-4)`

#### Card Structure
Each card contains:
1. **Left border** (4px, thick, color-coded)
   ```astro
   border-left: 4px solid #8B7FFF;
   ```

2. **Large emoji icon** (2rem font size)
   ```astro
   <div style="font-size: 2rem; margin-bottom: var(--s-2);">🎧</div>
   ```

3. **Title** (h3, no margin-top)
   ```astro
   <h3 style="margin: 0 0 var(--s-2) 0; color: var(--text);">Listening</h3>
   ```

4. **Bullet list** (no list markers, compact, muted text)
   ```astro
   <ul class="muted" style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem; line-height: 1.6;">
     <li>✓ Point one</li>
     <li>✓ Point two</li>
     <li>✓ Point three</li>
   </ul>
   ```

5. **Hover effect** (lift + shadow on interaction)
   ```astro
   transition: transform 0.2s, box-shadow 0.2s;
   onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(139,127,255,0.15)';"
   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"
   ```

6. **Pill-style link** (matches card color, appears on card)
   ```astro
   <div class="pill" style="background: #8B7FFF; color: white; padding: 0.4rem 0.8rem; border-radius: 4px; display: inline-block; font-size: 0.8rem;">
     Browse lessons →
   </div>
   ```

### When to Use This Pattern
✅ Presenting 3–4 related skill categories
✅ Skill selection pages (listening, reading, speaking, writing)
✅ Service type selection (webinars, tutoring, lessons)
✅ Feature highlights with distinct categories
✅ Category-based navigation

### When NOT to Use
❌ Less than 3 options (use simple buttons)
❌ More than 4 options (might need pagination or tabs)
❌ Content that isn't skill/category based

### Customization Guide
- **Change colors**: Replace color hex values for each card's border and pill background
- **Change emoji**: Swap the emoji in each card's icon div
- **Change grid columns**: Update `minmax(280px, 1fr)` — first number controls card min width
- **Change spacing**: Use `gap: var(--s-3)` or `var(--s-5)` instead of `var(--s-4)`

---

## 🎨 Design Decisions
- **Why color-coded borders?** Visual scanning — users quickly identify skill before reading
- **Why hover lift effect?** Feedback signal — subtle animation confirms interactivity without distraction
- **Why bullet lists?** Quick comprehension — scanning takes <2 seconds per card
- **Why emoji?** Memorable anchors — emoji + color + text = faster recognition

---

## 📝 Future Applications
When building new pages, consider this pattern for:
- Exam format selection (IELTS vs CELPIP)
- Lesson category pages
- Service options (webinars, tutoring, essay correction)
- Topic selection within a category
