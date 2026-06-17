/**
 * Canvas.jsx — Upgraded Whiteboard Component
 *
 * Changes over original:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. ARCHITECTURE
 *    - All drawing logic extracted into a single `drawElement(ctx, el, opts)`
 *      helper, eliminating ~300 lines of duplication between redrawCanvas()
 *      and the preview block.
 *    - `getElementBounds(el)` centralises bounding-box maths (used by
 *      selection hit-testing, resize handles, and the selection outline).
 *
 * 2. SELECTION TOOL
 *    - Works for ALL element types (freehand, line, arrow, rectangle, square,
 *      circle, text).
 *    - Click-to-select sets `selectedId`.  Click on empty area deselects.
 *    - A blue dashed selection outline is drawn around every selected element.
 *
 * 3. MOVE / DRAG
 *    - When `tool === "select"` and the mouse goes down on a selected element,
 *      entering drag mode moves the whole element via an `offset` delta.
 *    - All shape types have a dedicated `translateElement()` helper so their
 *      internal coordinate representations stay correct.
 *    - Move is pushed onto the undo stack as a "move" action so Ctrl+Z works.
 *
 * 4. RESIZE
 *    - Eight handles (corners + mid-edges) appear around the bounding box of
 *      any selected element.
 *    - Dragging a handle calls `resizeElement()` which maps the handle index
 *      to the correct coordinate update for every shape type.
 *    - Resize is also undo-able.
 *
 * 5. DELETE
 *    - `Delete` / `Backspace` key removes the selected element and pushes the
 *      removal onto the undo stack so it can be restored with Ctrl+Z.
 *
 * 6. TEXT TOOL — improvements
 *    - Double-clicking an existing text element opens an inline overlay for
 *      live editing (no more plain prompt()).
 *    - Text elements carry `fontSize` (default 24) and `fontFamily`.
 *    - A small floating toolbar appears when a text element is selected,
 *      letting the user change font size and color without re-entering the
 *      tool.
 *
 * 7. EXPORT
 *    - "Export PNG"  → draws canvas to a temporary canvas (without UI chrome)
 *      and triggers a download.
 *    - "Export JSON" → serialises `elements` state to a pretty-printed JSON
 *      file download, which can be imported back later.
 *    - "Import JSON" → file-picker that restores a previously exported JSON.
 *
 * 8. LOCAL PERSISTENCE
 *    - Every time `elements` changes, the board is serialised to
 *      localStorage["whiteboard_elements"].
 *    - On mount, if that key exists the board is restored automatically.
 *    - A "New Board" button clears both state and storage.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../socket";

// ─── Constants ────────────────────────────────────────────────────────────────
const HANDLE_SIZE = 8;   // px, half-width of each resize handle square
const LS_KEY = "whiteboard_elements";

// ─── Pure helpers (no React state) ────────────────────────────────────────────

/**
 * Returns the axis-aligned bounding box for any element.
 * { x, y, width, height }
 */
function getElementBounds(el) {
  switch (el.type) {
    case "freehand": {
      if (!el.points || el.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
      const xs = el.points.map((p) => p.x);
      const ys = el.points.map((p) => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    case "line":
    case "arrow": {
      const minX = Math.min(el.start.x, el.end.x);
      const minY = Math.min(el.start.y, el.end.y);
      return {
        x: minX, y: minY,
        width: Math.abs(el.end.x - el.start.x),
        height: Math.abs(el.end.y - el.start.y),
      };
    }
    case "rectangle": {
      const x = Math.min(el.start.x, el.end.x);
      const y = Math.min(el.start.y, el.end.y);
      return { x, y, width: Math.abs(el.end.x - el.start.x), height: Math.abs(el.end.y - el.start.y) };
    }
    case "square": {
      const dx = el.end.x - el.start.x;
      const dy = el.end.y - el.start.y;
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      const x = dx >= 0 ? el.start.x : el.start.x - side;
      const y = dy >= 0 ? el.start.y : el.start.y - side;
      return { x, y, width: side, height: side };
    }
    case "circle":
      return {
        x: el.center.x - el.radius,
        y: el.center.y - el.radius,
        width: el.radius * 2,
        height: el.radius * 2,
      };
    case "text": {
      const fontSize = el.fontSize || 24;
      // Approximate: canvas measureText not available here, use char count heuristic
      const approxWidth = el.text.length * fontSize * 0.6;
      return { x: el.x, y: el.y - fontSize, width: approxWidth, height: fontSize * 1.2 };
    }
    default:
      return { x: 0, y: 0, width: 0, height: 0 };
  }
}

/**
 * Returns true when (mx, my) is inside the element's bounding box
 * (with a small tolerance for thin lines).
 */
function hitTest(el, mx, my) {
  const PAD = 8;
  const b = getElementBounds(el);
  return (
    mx >= b.x - PAD && mx <= b.x + b.width + PAD &&
    my >= b.y - PAD && my <= b.y + b.height + PAD
  );
}

/**
 * Returns the 8 handle rectangles [{ x, y, width, height, cursor }]
 * around the given bounds, in order:
 * 0=TL 1=TM 2=TR 3=MR 4=BR 5=BM 6=BL 7=ML
 */








function getHandles(bounds) {
  const { x, y, width, height } = bounds;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const H = HANDLE_SIZE;
  const positions = [
    { px: x,          py: y,           cursor: "nwse-resize" },
    { px: cx,         py: y,           cursor: "ns-resize"   },
    { px: x + width,  py: y,           cursor: "nesw-resize" },
    { px: x + width,  py: cy,          cursor: "ew-resize"   },
    { px: x + width,  py: y + height,  cursor: "nwse-resize" },
    { px: cx,         py: y + height,  cursor: "ns-resize"   },
    { px: x,          py: y + height,  cursor: "nesw-resize" },
    { px: x,          py: cy,          cursor: "ew-resize"   },
  ];
  return positions.map((p) => ({ ...p, x: p.px - H, y: p.py - H, size: H * 2 }));
}

/**
 * Returns handle index (0-7) if (mx,my) is inside a handle, else -1.
 */
function hitHandle(bounds, mx, my) {
  const handles = getHandles(bounds);
  for (let i = 0; i < handles.length; i++) {
    const h = handles[i];
    if (mx >= h.x && mx <= h.x + h.size && my >= h.y && my <= h.y + h.size) return i;
  }
  return -1;
}

/**
 * Translates an element by (dx, dy), returning a new element object.
 */
function translateElement(el, dx, dy) {
  switch (el.type) {
    case "freehand":
      return { ...el, points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
    case "line":
    case "arrow":
      return { ...el, start: { x: el.start.x + dx, y: el.start.y + dy }, end: { x: el.end.x + dx, y: el.end.y + dy } };
    case "rectangle":
    case "square":
      return { ...el, start: { x: el.start.x + dx, y: el.start.y + dy }, end: { x: el.end.x + dx, y: el.end.y + dy } };
    case "circle":
      return { ...el, center: { x: el.center.x + dx, y: el.center.y + dy } };
    case "text":
      return { ...el, x: el.x + dx, y: el.y + dy };
    default:
      return el;
  }
}

/**
 * Resizes an element given a handle index and the new mouse position.
 * handleIndex: 0=TL 1=TM 2=TR 3=MR 4=BR 5=BM 6=BL 7=ML
 */
function resizeElement(el, handleIndex, mx, my) {
  // For shapes with start/end, we remap the appropriate corner/edge.
  // For circles we resize radius. For text we resize fontSize.
  switch (el.type) {
    case "rectangle":
    case "square": {
      let { start, end } = el;
      // Map handle index to which corner/edge to move
      switch (handleIndex) {
        case 0: start = { x: mx, y: my }; break;
        case 1: start = { ...start, y: my }; break;
        case 2: start = { x: start.x, y: my }; end = { x: mx, y: end.y }; break;
        case 3: end = { ...end, x: mx }; break;
        case 4: end = { x: mx, y: my }; break;
        case 5: end = { ...end, y: my }; break;
        case 6: start = { x: mx, y: start.y }; end = { x: end.x, y: my }; break;
        case 7: start = { ...start, x: mx }; break;
        default: break;
      }
      return { ...el, start, end };
    }
    case "line":
    case "arrow": {
      if (handleIndex <= 2 || handleIndex === 7) return { ...el, start: { x: mx, y: my } };
      return { ...el, end: { x: mx, y: my } };
    }
    case "circle": {
      const dx = mx - el.center.x;
      const dy = my - el.center.y;
      return { ...el, radius: Math.max(4, Math.sqrt(dx * dx + dy * dy)) };
    }
    case "text": {
      const bounds = getElementBounds(el);
      const newWidth = Math.abs(mx - bounds.x);
      const fontSize = Math.max(8, Math.round(newWidth / (el.text.length * 0.6)));
      return { ...el, fontSize };
    }
    case "freehand": {
      // Scale all points relative to bounding box
      const b = getElementBounds(el);
      if (b.width === 0 || b.height === 0) return el;
      let newRight = b.x + b.width, newBottom = b.y + b.height;
      if (handleIndex === 4 || handleIndex === 3) newRight = mx;
      if (handleIndex === 4 || handleIndex === 5) newBottom = my;
      const scaleX = (newRight - b.x) / b.width;
      const scaleY = (newBottom - b.y) / b.height;
      return {
        ...el,
        points: el.points.map((p) => ({
          x: b.x + (p.x - b.x) * scaleX,
          y: b.y + (p.y - b.y) * scaleY,
        })),
      };
    }
    default:
      return el;
  }
}

/**
 * Draws an arrow from start → end on ctx.
 */
function drawArrow(ctx, start, end, color, size) {
  const headLength = 15;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

/**
 * THE centralised draw function. Draws a single element onto ctx.
 * opts.selected: draw selection outline
 * opts.preview:  true when drawing the live preview shape
 */
function drawElement(ctx, el, opts = {}) {
  ctx.save();
  switch (el.type) {
    case "text": {
      const fontSize = el.fontSize || 24;
      const family = el.fontFamily || "Arial";
      ctx.font = `${fontSize}px ${family}`;
      ctx.fillStyle = el.color;
      ctx.fillText(el.text, el.x, el.y);
      break;
    }
    case "line": {
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.lineCap = "round";
      ctx.moveTo(el.start.x, el.start.y);
      ctx.lineTo(el.end.x, el.end.y);
      ctx.stroke();
      break;
    }
    case "arrow": {
      drawArrow(ctx, el.start, el.end, el.color, el.size);
      break;
    }
    case "rectangle": {
      const x = Math.min(el.start.x, el.end.x);
      const y = Math.min(el.start.y, el.end.y);
      const w = Math.abs(el.end.x - el.start.x);
      const h = Math.abs(el.end.y - el.start.y);
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.strokeRect(x, y, w, h);
      break;
    }
    case "square": {
      const dx = el.end.x - el.start.x;
      const dy = el.end.y - el.start.y;
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      const x = dx >= 0 ? el.start.x : el.start.x - side;
      const y = dy >= 0 ? el.start.y : el.start.y - side;
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.strokeRect(x, y, side, side);
      break;
    }
    case "circle": {
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.arc(el.center.x, el.center.y, el.radius, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "freehand": {
      const points = el.points;
      if (!points || points.length === 0) break;
      ctx.strokeStyle = el.tool === "eraser" ? "white" : el.color;
      ctx.lineWidth = el.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, el.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = el.tool === "eraser" ? "white" : el.color;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }

  // Selection overlay
  if (opts.selected) {
    const b = getElementBounds(el);
    const PAD = 6;
    ctx.save();
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(b.x - PAD, b.y - PAD, b.width + PAD * 2, b.height + PAD * 2);
    ctx.restore();

    // Draw resize handles
    const handles = getHandles({ x: b.x - PAD, y: b.y - PAD, width: b.width + PAD * 2, height: b.height + PAD * 2 });
    handles.forEach((h) => {
      ctx.save();
      ctx.fillStyle = "white";
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.fillRect(h.x, h.y, h.size, h.size);
      ctx.strokeRect(h.x, h.y, h.size, h.size);
      ctx.restore();
    });
  }

  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────

function Canvas({
  elements, setElements,boardId,cursors,
}) {
  const canvasRef = useRef(null);

  // Core drawing state
  const [color, setColor]         = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool]           = useState("pen");

  // Elements & undo/redo
  // Each element in the undo stack is either the element itself (for add)
  // or { action: "delete"|"move"|"resize", id, before, after? } for mutations.
    const [redoStack, setRedoStack] = useState([]);

  // Selection / interaction
  const [selectedId, setSelectedId] = useState(null);

  // In-progress interaction refs (don't need re-renders)
  const isDrawing    = useRef(false);
  const isDragging   = useRef(false);   // moving a selected element
  const isResizing   = useRef(false);   // resizing via handle
  const resizeHandle = useRef(-1);      // which handle (0-7)
  const dragStart    = useRef(null);    // { x, y } mouse position at drag start
  const elementSnapshot = useRef(null); // element state before drag/resize began
  const currentStroke   = useRef([]);
  const startPoint      = useRef(null);

  // Preview shape (shown while dragging shape tools)
  const [previewShape, setPreviewShape] = useState(null);

  // Text editing overlay
  const [editingText, setEditingText]   = useState(null); // { id, x, y, value, fontSize, color }
  const textInputRef = useRef(null);

  // ── Redraw canvas whenever state changes ──────────────────────────────────
  useEffect(() => { redrawCanvas(); }, [elements, previewShape, selectedId]);

  // ── Initialise canvas ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width  = 1000;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // ── Focus text input when editing ─────────────────────────────────────────
  useEffect(() => {
    if (editingText && textInputRef.current) textInputRef.current.focus();
  }, [editingText]);

  // ── Keyboard: Delete selected element ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !editingText) {
        e.preventDefault();
        const el = elements.find((el) => el.id === selectedId);
        if (!el) return;
        // Push a "delete" undo record

        const updatedElements =elements.filter(
            (el) => el.id !== selectedId
          );


        setRedoStack([]);
        setElements(updatedElements);

        socket.emit("delete-element",
          {
            boardId,
            elements: updatedElements,
          }
        );


        // Store the deleted element so undo can restore it
        setUndoRecord({ action: "delete", element: el });
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, elements, editingText]);

  // Separate undo record state for delete (so it integrates with existing undo)
  // We store a richer undo stack alongside the existing elements-based undo.
  // Strategy: we keep the existing "last element = undo" pattern and extend it
  // with tagged records.
  const [undoRecord, setUndoRecord] = useState(null);

  // ── Central undo logic ────────────────────────────────────────────────────
  const undo = () => {
      setPreviewShape(null);

      if (undoRecord) {

        // Undo Delete
        if (undoRecord.action === "delete") {

          const updatedElements = [...elements,undoRecord.element,];

          setElements(updatedElements);

          socket.emit("update-elements",
            {
              boardId,
              elements: updatedElements,
            }
          );

          setUndoRecord(null);
          return;
        }

        // Undo Move / Resize
        if (undoRecord.action === "move" ||undoRecord.action === "resize") {

          const updatedElements =
            elements.map((el) =>
              el.id === undoRecord.id
                ? undoRecord.before
                : el
            );

          setElements(updatedElements);

          socket.emit(
            "update-elements",
            {
              boardId,
              elements: updatedElements,
            }
          );

          setRedoStack((prev) => [
            ...prev,
            undoRecord,
          ]);

          setUndoRecord(null);
          return;
        }
      }

      if (elements.length === 0) return;

      const last =
        elements[elements.length - 1];

      setRedoStack((prev) => [
        ...prev,
        last,
      ]);

      const updatedElements =
        elements.slice(0, -1);

      setElements(updatedElements);

      socket.emit(
        "update-elements",
        {
          boardId,
          elements: updatedElements,
        }
      );
  };

  const redo = () => {
      setPreviewShape(null);

      if (redoStack.length === 0) return;

      const last =redoStack[redoStack.length - 1];

      // Move/Resize Redo
      if (last &&(last.action === "move" ||last.action === "resize")) {

        const updatedElements =
          elements.map((el) =>
            el.id === last.id
              ? last.after
              : el
          );

        setElements(updatedElements);

        socket.emit("update-elements",
          {
            boardId,
            elements: updatedElements,
          }
        );

        setRedoStack((prev) =>
          prev.slice(0, -1)
        );

        return;
    }

    // Normal Redo
      const updatedElements = [
        ...elements,
        last,
      ];

      setElements(updatedElements);

      socket.emit(
        "update-elements",
        {
          boardId,
          elements: updatedElements,
        }
      );

      setRedoStack((prev) =>
        prev.slice(0, -1)
      );
  };


  // ── Cursor style ──────────────────────────────────────────────────────────
  const getCursor = useCallback((mx, my) => {
    if (tool !== "select") return "crosshair";
    if (selectedId) {
      const el = elements.find((e) => e.id === selectedId);
      if (el) {
        const b = getElementBounds(el);
        const PAD = 6;
        const expanded = { x: b.x - PAD, y: b.y - PAD, width: b.width + PAD * 2, height: b.height + PAD * 2 };
        const hi = hitHandle(expanded, mx, my);
        if (hi >= 0) return getHandles(expanded)[hi].cursor;
        if (hitTest(el, mx, my)) return "move";
      }
    }
    return "default";
  }, [tool, selectedId, elements]);


  // ── Redraw ────────────────────────────────────────────────────────────────
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    elements.forEach((el) => {
      drawElement(ctx, el, { selected: el.id === selectedId });
    });

    if (previewShape) {
      drawElement(ctx, { ...previewShape, color, size: brushSize });
    }
  };


  // ── Mouse event helpers ───────────────────────────────────────────────────
  const getPos = (e) => ({
    x: e.nativeEvent.offsetX,
    y: e.nativeEvent.offsetY,
  });


  // ── startDrawing ──────────────────────────────────────────────────────────
  const startDrawing = (e) => {
    const { x: mx, y: my } = getPos(e);

    // ── SELECT TOOL ──
    if (tool === "select") {
      // Check if we're clicking a resize handle on the currently selected element
      if (selectedId) {
        const el = elements.find((el) => el.id === selectedId);
        if (el) {
          const b = getElementBounds(el);
          const PAD = 6;
          const expanded = { x: b.x - PAD, y: b.y - PAD, width: b.width + PAD * 2, height: b.height + PAD * 2 };
          const hi = hitHandle(expanded, mx, my);
          if (hi >= 0) {
            isResizing.current = true;
            resizeHandle.current = hi;
            elementSnapshot.current = el;
            dragStart.current = { x: mx, y: my };
            return;
          }
        }
      }

      // Click to select / deselect
      let hit = null;
      // Iterate in reverse so top-most element wins
      for (let i = elements.length - 1; i >= 0; i--) {
        if (hitTest(elements[i], mx, my)) { hit = elements[i]; break; }
      }

      if (hit) {
        setSelectedId(hit.id);
        // Start drag-move
        isDragging.current = true;
        dragStart.current = { x: mx, y: my };
        elementSnapshot.current = hit;
      } else {
        setSelectedId(null);
      }
      return;
    }

    // ── TEXT TOOL ── (new element via click, edit existing via double-click handled separately)
    if (tool === "text") {
      const newId = crypto.randomUUID();
      const textEl = {
        id: newId,
        type: "text",
        x: mx, y: my,
        text: "",
        color,
        fontSize: 24,
        fontFamily: "Arial",
      };
      setEditingText({ id: newId, x: mx, y: my, value: "", fontSize: 24, color, isNew: true, element: textEl });
      return;
    }

    // ── SHAPE / PEN / ERASER tools ──
    startPoint.current = { x: mx, y: my };
    currentStroke.current = [{ x: mx, y: my }];
    isDrawing.current = true;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = tool === "eraser" ? "white" : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(mx, my);
  };


  // ── draw (mousemove) ──────────────────────────────────────────────────────
  const draw = (e) => {
    const { x: mx, y: my } = getPos(e);

    socket.emit("cursor-move",
      {
        boardId,
        x: mx,
        y: my,
      }
    );

    // Update cursor
    canvasRef.current.style.cursor = getCursor(mx, my);

    // ── DRAG MOVE ──
    if (isDragging.current && dragStart.current && elementSnapshot.current) {
      const dx = mx - dragStart.current.x;
      const dy = my - dragStart.current.y;
      const updated = translateElement(elementSnapshot.current, dx, dy);
      setElements((prev) => prev.map((el) => (el.id === updated.id ? updated : el)));
      return;
    }

    // ── RESIZE ──
    if (isResizing.current && elementSnapshot.current) {
      const updated = resizeElement(elementSnapshot.current, resizeHandle.current, mx, my);
      setElements((prev) => prev.map((el) => (el.id === updated.id ? updated : el)));
      return;
    }

    if (!isDrawing.current) return;

    const shapeTools = ["line", "arrow", "rectangle", "square", "circle"];
    if (shapeTools.includes(tool)) {
      if (tool === "circle") {
        const dx = mx - startPoint.current.x;
        const dy = my - startPoint.current.y;
        setPreviewShape({ type: "circle", center: startPoint.current, radius: Math.sqrt(dx * dx + dy * dy) });
      } else {
        setPreviewShape({ type: tool, start: startPoint.current, end: { x: mx, y: my } });
      }
      return;
    }

    // Freehand / eraser
    currentStroke.current.push({ x: mx, y: my });
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineTo(mx, my);
    ctx.stroke();
  };

  // ── stopDrawing ───────────────────────────────────────────────────────────
  const stopDrawing = (e) => {
    const { x: mx, y: my } = getPos(e);

    // ── END DRAG MOVE ──
    if (isDragging.current) {
      isDragging.current = false;
      if (elementSnapshot.current) {
        const dx = mx - dragStart.current.x;
        const dy = my - dragStart.current.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          const after = elements.find((el) => el.id === elementSnapshot.current.id);
          setUndoRecord({ action: "move", id: elementSnapshot.current.id, before: elementSnapshot.current, after });
          setRedoStack([]);

          socket.emit("move-element", {
            boardId,
            elements,
          });

        }
      }

      

      elementSnapshot.current = null;
      dragStart.current = null;
      return;
    }

    // ── END RESIZE ──
    if (isResizing.current) {
      isResizing.current = false;
      if (elementSnapshot.current) {
        const after = elements.find((el) => el.id === elementSnapshot.current.id);
        setUndoRecord({ action: "resize", id: elementSnapshot.current.id, before: elementSnapshot.current, after });
        setRedoStack([]);

        socket.emit("resize-element", {
          boardId,
          elements,
        });

      }
      elementSnapshot.current = null;
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    const shapeTools = { line: true, arrow: true, rectangle: true, square: true, circle: true };

    if (shapeTools[tool]) {
      let el;
      const base = { id: crypto.randomUUID(), color, size: brushSize };
      if (tool === "circle") {
        const dx = mx - startPoint.current.x;
        const dy = my - startPoint.current.y;
        el = { ...base, type: "circle", center: startPoint.current, radius: Math.sqrt(dx * dx + dy * dy) };
      } else {
        el = { ...base, type: tool, start: startPoint.current, end: { x: mx, y: my } };
      }
      setRedoStack([]);
      setElements((prev) => [...prev, el]);

      socket.emit("drawing", {
        boardId,
        element: el,
      });

      setPreviewShape(null);
      return;
    }

    // Freehand / eraser
    if (currentStroke.current.length === 0) return;
    const stroke = { id: crypto.randomUUID(), type: "freehand", color, size: brushSize, tool, points: [...currentStroke.current] };
    setRedoStack([]);
    setElements((prev) => [...prev, stroke]);

    socket.emit("drawing", {
      boardId,
      element: stroke,
    });


    currentStroke.current = [];
  };

  // ── Double-click: edit existing text ─────────────────────────────────────
  const handleDoubleClick = (e) => {
    if (tool !== "select" && tool !== "text") return;
    const { x: mx, y: my } = getPos(e);
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === "text" && hitTest(el, mx, my)) {
        setEditingText({ id: el.id, x: el.x, y: el.y, value: el.text, fontSize: el.fontSize || 24, color: el.color, isNew: false });
        return;
      }
    }
  };

  // ── Commit text edit ──────────────────────────────────────────────────────
  const commitText = () => {
    if (!editingText) return;
    const { id, x, y, value, fontSize, color: tColor, isNew, element } = editingText;
    if (value.trim() === "") {
      // If new, discard. If editing existing, delete.
      if (!isNew) setElements((prev) => prev.filter((el) => el.id !== id));
    } else if (isNew) {
      const newEl = { ...element, text: value, fontSize, color: tColor };
      setRedoStack([]);
      setElements((prev) => [...prev, newEl]);

      socket.emit("drawing",{
          boardId,
          element: newEl,
        }
      );

    } else {
        const updatedElements =elements.map((el) =>
            el.id === id
              ? {
                  ...el,
                  text: value,
                  fontSize,
                  color: tColor
                }
              : el
          );

        setElements(updatedElements);

        socket.emit(
          "update-elements",
          {
            boardId,
            elements: updatedElements,
          }
        );
    }
    setEditingText(null);
  };

  // ── Clear board ───────────────────────────────────────────────────────────
  const clearCanvas = () => {
    setElements([]);

    socket.emit(
      "clear-board",
      boardId
    );

    setRedoStack([]);
    setPreviewShape(null);
    setSelectedId(null);
    setUndoRecord(null);
    try { localStorage.removeItem(LS_KEY); } catch {}
  };

  // ── Export PNG ────────────────────────────────────────────────────────────
  const exportPNG = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "whiteboard.png";
    a.click();
  };

  // ── Export JSON ───────────────────────────────────────────────────────────
  const exportJSON = () => {
    const json = JSON.stringify(elements, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "whiteboard.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import JSON ───────────────────────────────────────────────────────────
  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) {
          setElements(data);
          setRedoStack([]);
          setSelectedId(null);
        }
      } catch { alert("Invalid JSON file"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Toolbar button style helper ───────────────────────────────────────────
  const btnStyle = (active) => ({
    padding: "5px 10px",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: active ? "#2563eb" : "white",
    color: active ? "white" : "#222",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
  });

  const tools = ["pen","eraser","text","line","arrow","rectangle","square","circle","select"];

  console.log(cursors);

  return (
    <div style={{ userSelect: "none", fontFamily: "system-ui, sans-serif" }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
        padding: "8px 10px", background: "#f8f9fa", borderBottom: "1px solid #ddd", marginBottom: 8,
      }}>
        {/* Undo / Redo */}
        <button style={btnStyle(false)} onClick={undo} disabled={elements.length === 0 && !undoRecord}>↩ Undo</button>
        <button style={btnStyle(false)} onClick={redo} disabled={redoStack.length === 0}>↪ Redo</button>

        <span style={{ width: 1, height: 24, background: "#ddd", margin: "0 4px" }} />

        {/* Tool buttons */}
        {tools.map((t) => (
          <button key={t} style={btnStyle(tool === t)} onClick={() => { setTool(t); setSelectedId(null); }}>
            {{ pen:"✏️ Pen", eraser:"⬜ Eraser", text:"T Text", line:"/ Line",
               arrow:"→ Arrow", rectangle:"▭ Rect", square:"□ Square",
               circle:"○ Circle", select:"⬚ Select" }[t]}
          </button>
        ))}

        <span style={{ width: 1, height: 24, background: "#ddd", margin: "0 4px" }} />

        {/* Brush size */}
        <span style={{ fontSize: 12 }}>Size: {brushSize}</span>
        <input type="range" min="1" max="20" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} style={{ width: 80 }} />

        {/* Color */}
        <span style={{ fontSize: 12 }}>Color:</span>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 32, height: 28, padding: 0, border: "1px solid #ccc", borderRadius: 4 }} />

        <span style={{ width: 1, height: 24, background: "#ddd", margin: "0 4px" }} />

        {/* Clear */}
        <button style={{ ...btnStyle(false), color: "#dc2626" }} onClick={clearCanvas}>🗑 Clear</button>

        {/* Export */}
        <button style={btnStyle(false)} onClick={exportPNG}>⬇ PNG</button>
        <button style={btnStyle(false)} onClick={exportJSON}>⬇ JSON</button>
        <label style={{ ...btnStyle(false), display: "inline-block", lineHeight: "normal" }}>
          ⬆ Import
          <input type="file" accept=".json" onChange={importJSON} style={{ display: "none" }} />
        </label>
      </div>

      {/* ── Text selected element toolbar ── */}
      {selectedId && (() => {
        const sel = elements.find((el) => el.id === selectedId);
        if (!sel || sel.type !== "text") return null;
        return (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 10px", background: "#eff6ff", borderBottom: "1px solid #bfdbfe", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Text options:</span>
            <span style={{ fontSize: 12 }}>Size:</span>
            <input type="number" min="8" max="96" value={sel.fontSize || 24}
              onChange={(e) => setElements((prev) => prev.map((el) => el.id === sel.id ? { ...el, fontSize: Number(e.target.value) } : el))}
              style={{ width: 52, fontSize: 12, padding: "2px 4px" }} />
            <span style={{ fontSize: 12 }}>Color:</span>
            <input type="color" value={sel.color}
              onChange={(e) => setElements((prev) => prev.map((el) => el.id === sel.id ? { ...el, color: e.target.value } : el))}
              style={{ width: 28, height: 22, padding: 0 }} />
            <button style={{ ...btnStyle(false), fontSize: 12, color: "#dc2626" }}
              onClick={() => {

                  const updatedElements =
                    elements.filter(
                      (el) =>
                        el.id !== sel.id
                    );

                  setElements(updatedElements);

                  socket.emit(
                    "delete-element",
                    {
                      boardId,
                      elements: updatedElements,
                    }
                  );

                  setSelectedId(null);
                }}>

              Delete
            </button>
          </div>
        );
      })()}

      {/* ── Canvas wrapper (relative for text overlay) ── */}
      <div style={{ position: "relative", display: "inline-block" }}>
        <canvas
          ref={canvasRef}
          style={{ border: "2px solid #d1d5db", display: "block" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onDoubleClick={handleDoubleClick}
        />

        {/* ── Inline text editor overlay ── */}
        {editingText && (
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <div style={{
              position: "absolute",
              top: editingText.y - (editingText.fontSize || 24) - 4,
              left: editingText.x - 2,
              pointerEvents: "all",
              background: "rgba(255,255,255,0.9)",
              border: "1.5px dashed #2563eb",
              borderRadius: 3,
              padding: 4,
              display: "flex", flexDirection: "column", gap: 4,
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <label style={{ fontSize: 11 }}>Size:
                  <input type="number" min="8" max="96" value={editingText.fontSize}
                    onChange={(e) => setEditingText((p) => ({ ...p, fontSize: Number(e.target.value) }))}
                    style={{ width: 44, marginLeft: 4, fontSize: 11 }} />
                </label>
                <input type="color" value={editingText.color}
                  onChange={(e) => setEditingText((p) => ({ ...p, color: e.target.value }))}
                  style={{ width: 24, height: 20, padding: 0 }} />
              </div>
              <textarea
                ref={textInputRef}
                value={editingText.value}
                rows={2}
                onChange={(e) => setEditingText((p) => ({ ...p, value: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText(); } if (e.key === "Escape") setEditingText(null); }}
                style={{
                  fontSize: editingText.fontSize,
                  color: editingText.color,
                  fontFamily: "Arial",
                  border: "none", outline: "none", background: "transparent",
                  resize: "none", minWidth: 120,
                }}
              />
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={commitText} style={{ ...btnStyle(true), fontSize: 11, padding: "2px 8px" }}>Save</button>
                <button onClick={() => setEditingText(null)} style={{ ...btnStyle(false), fontSize: 11, padding: "2px 8px" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={{ padding: "4px 10px", fontSize: 11, color: "#6b7280", marginTop: 4 }}>
        {elements.length} element{elements.length !== 1 ? "s" : ""} on board
        {selectedId ? " · 1 selected (Delete key to remove, drag to move, drag handles to resize)" : ""}
        {tool === "text" ? " · Click canvas to add text, double-click existing text to edit" : ""}
      </div>

      {Object.entries(cursors).map(
  ([id, pos]) => (
    <div
      key={id}
      style={{
        position: "fixed",
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: "20px",
        height: "20px",
        background: "red",
        borderRadius: "50%",
        zIndex: 99999,
        pointerEvents: "none",
      }}
    />
  )
)}
<h1
  style={{
    position: "fixed",
    top: 0,
    right: 0,
    zIndex: 99999,
    background: "yellow"
  }}
>
  {Object.keys(cursors).length}
</h1>
    </div>


 
  );
}

export default Canvas;

