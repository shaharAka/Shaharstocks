# Design Guidelines: Stock Analysis Landing Page

## Design Approach
**Selected Approach:** Reference-Based (Fintech/SaaS)  
**Inspiration:** Stripe's minimalist clarity + Robinhood's approachable finance aesthetic  
**Rationale:** Financial applications demand trust and professionalism while maintaining approachability. Clean, data-focused design with minimal distractions.

## Core Design Elements

### Typography
- **Headings:** Inter or SF Pro Display
  - H1: text-5xl md:text-6xl font-bold (Hero)
  - H2: text-3xl md:text-4xl font-semibold (Section headers)
- **Body:** Inter or SF Pro Text
  - Primary: text-base md:text-lg (16-18px)
  - Secondary: text-sm (14px)
- **Monospace (for numbers/data):** JetBrains Mono or Roboto Mono
  - Financial figures: text-lg md:text-xl font-mono

### Layout System
**Spacing Units:** Use Tailwind's 4, 8, 12, 16, 20, 24 units
- Component padding: p-4, p-8
- Section spacing: py-12, py-16, py-20
- Gaps: gap-4, gap-8, gap-12
- Max container width: max-w-7xl

### Component Structure

**Header/Navigation:**
- Fixed top navigation with backdrop blur
- Logo left, navigation center (or right on mobile)
- Primary CTA button (e.g., "Get Started" or "Sign In")
- Height: h-16 md:h-20
- Include subtle border-bottom for definition

**Hero Section:**
- Height: min-h-[600px] md:min-h-[700px] (not forced 100vh)
- Center-aligned content with max-w-4xl
- Headline + supporting text + CTA button(s)
- Include a large hero image or abstract data visualization background
- For hero CTAs on images: Use backdrop-blur-sm bg-white/10 treatment

**Content Sections:**
- Vertical padding: py-16 md:py-24
- Consistent max-w-7xl mx-auto containers
- Single-column layout for simplicity (since it's a placeholder)

**Footer:**
- Simple footer with py-8 md:py-12
- Copyright text and basic links
- Optional: Social media icons placeholder

### Visual Elements

**Buttons:**
- Primary: Rounded (rounded-lg), medium padding (px-6 py-3)
- Text: font-medium text-sm md:text-base
- For buttons on hero images: backdrop-blur-sm with semi-transparent background

**Cards (if used):**
- Rounded corners: rounded-xl
- Subtle shadow or border for definition
- Padding: p-6 md:p-8

**Icons:**
- Use Heroicons (outline style for consistency)
- Size: w-6 h-6 for inline, w-8 h-8 or w-12 h-12 for features

### Animations
**Minimal/None** - Keep the landing page static and fast-loading since it's a placeholder. No scroll animations or complex transitions.

## Images

**Hero Section:**
- Large hero image showing abstract data visualization, stock charts, or dashboard mockup
- Dimensions: Full-width, approximately 1920x800px
- Treatment: Subtle gradient overlay for text legibility
- Alternative: Abstract geometric pattern representing financial data/growth

**Purpose:** Establishes professional, finance-focused context while remaining placeholder-friendly

## Layout Specifications

**Page Structure:**
1. Navigation header (fixed)
2. Hero section with image background
3. Optional: 1-2 simple content sections with placeholder text
4. Footer

**Responsive Behavior:**
- Mobile: Single column, stacked elements
- Tablet: Maintain single column with increased spacing
- Desktop: Full layout with max-w-7xl constraint

**Key Principle:** Clean, minimal, professional placeholder that provides structure without overwhelming content. Easy to replace text and customize while maintaining visual polish.