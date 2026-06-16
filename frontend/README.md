# Collab Board

A collaborative whiteboard application built with React and HTML Canvas. Users can draw, erase, create lines, and manage drawing history with Undo/Redo functionality.

---

## Features

### Drawing

* Freehand Drawing
* Pen Tool
* Eraser Tool
* Color Picker
* Adjustable Brush Size

### History Management

* Undo
* Redo
* Clear Board

### Shapes

* Line Tool
* Live Line Preview

---

## Tech Stack

### Frontend

* React
* JavaScript (ES6+)
* HTML Canvas
* CSS

### React Hooks Used

* `useState`
* `useRef`
* `useEffect`

---

## Project Structure

```text
src/
│
├── components/
│   └── Canvas.jsx
│
├── App.jsx
├── main.jsx
└── index.css
```

---

## Application Architecture

The application follows a state-driven rendering approach.

### Source of Truth

All drawings are stored inside a history array.

```javascript
const [strokes, setStrokes] = useState([]);
```

Canvas is treated as a rendering surface only.

### Rendering Flow

```text
User Action
    ↓
Update State
    ↓
redrawCanvas()
    ↓
Canvas Updated
```

---

## Data Models

### Freehand Stroke

```javascript
{
  type: "freehand",
  color: "#000000",
  size: 5,
  tool: "pen",
  points: [
    { x: 100, y: 100 },
    { x: 105, y: 103 },
    { x: 110, y: 108 }
  ]
}
```

### Line Element

```javascript
{
  type: "line",
  color: "#000000",
  size: 5,
  start: {
    x: 100,
    y: 100
  },
  end: {
    x: 300,
    y: 250
  }
}
```

---

## Undo / Redo Design

Two separate collections are maintained:

```javascript
const [strokes, setStrokes] = useState([]);
const [redoStack, setRedoStack] = useState([]);
```

### Undo

```text
strokes → redoStack
```

### Redo

```text
redoStack → strokes
```

Whenever a new drawing is created, the redo history is cleared.

---

## Installation

Clone the repository:

```bash
git clone <repository-url>
```

Move into the project directory:

```bash
cd collab-board
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

---

## Current Features Checklist

* [x] Freehand Drawing
* [x] Pen Tool
* [x] Eraser Tool
* [x] Color Picker
* [x] Brush Size Selector
* [x] Clear Board
* [x] Undo
* [x] Redo
* [x] Line Tool
* [x] Live Line Preview

---

## Planned Features

* [ ] Rectangle Tool
* [ ] Circle Tool
* [ ] Arrow Tool
* [ ] Text Tool
* [ ] Save Board
* [ ] Export as PNG
* [ ] Real-Time Collaboration
* [ ] Room-Based Whiteboards
* [ ] User Authentication
* [ ] Infinite Canvas

---

## Learning Outcomes

This project demonstrates:

* React Fundamentals
* Canvas API
* State Management
* Undo/Redo Systems
* Interactive UI Development
* Data Modeling
* Frontend Architecture
* Event Handling

---

## Author

**Raman Kumar**
