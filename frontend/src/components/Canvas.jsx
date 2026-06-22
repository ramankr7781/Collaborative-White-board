import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../socket";

const HANDLE_SIZE = 8;
const LS_KEY = "whiteboard_elements";

function getElementBounds(el) {
  switch (el.type) {
    case "freehand": {
      if (!el.points || el.points.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }
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
        x: minX,
        y: minY,
        width: Math.abs(el.end.x - el.start.x),
        height: Math.abs(el.end.y - el.start.y),
      };
    }
    case "rectangle": {
      const x = Math.min(el.start.x, el.end.x);
      const y = Math.min(el.start.y, el.end.y);
      return {
        x,
        y,
        width: Math.abs(el.end.x - el.start.x),
        height: Math.abs(el.end.y - el.start.y),
      };
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
      const approxWidth = (el.text?.length || 0) * fontSize * 0.6;
      return {
        x: el.x,
        y: el.y - fontSize,
        width: approxWidth,
        height: fontSize * 1.2,
      };
    }
    default:
      return { x: 0, y: 0, width: 0, height: 0 };
  }
}

function pointToLineSegmentDist(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return Math.hypot(px - projX, py - projY);
}

function hitTest(el, mx, my, forceSolid = false) {
  const PAD = (el.size ? el.size / 2 : 5) + 10;
  const b = getElementBounds(el);

  // quick bounding-box reject
  if (
    mx < b.x - PAD ||
    mx > b.x + b.width + PAD ||
    my < b.y - PAD ||
    my > b.y + b.height + PAD
  ) {
    return false;
  }

  if (el.type === "freehand") {
    if (el.isFilled || forceSolid) return true;

    for (let i = 0; i < el.points.length - 1; i++) {
      if (
        pointToLineSegmentDist(
          mx,
          my,
          el.points[i].x,
          el.points[i].y,
          el.points[i + 1].x,
          el.points[i + 1].y
        ) <= PAD
      ) {
        return true;
      }
    }

    return (
      el.points.length === 1 &&
      Math.hypot(mx - el.points[0].x, my - el.points[0].y) <= PAD
    );
  }

  if (el.type === "line" || el.type === "arrow") {
    return (
      pointToLineSegmentDist(
        mx,
        my,
        el.start.x,
        el.start.y,
        el.end.x,
        el.end.y
      ) <= PAD
    );
  }

  if (el.type === "circle") {
    const distToCenter = Math.hypot(mx - el.center.x, my - el.center.y);

    // if selecting/filling, allow click anywhere inside circle
    if (el.isFilled || forceSolid) {
      return distToCenter <= el.radius + PAD;
    }

    // otherwise only border click counts
    return Math.abs(distToCenter - el.radius) <= PAD;
  }

  if (el.type === "rectangle" || el.type === "square") {
    // if selecting/filling, allow click anywhere inside rectangle
    if (el.isFilled || forceSolid) return true;

    const top = pointToLineSegmentDist(mx, my, b.x, b.y, b.x + b.width, b.y);
    const bottom = pointToLineSegmentDist(
      mx,
      my,
      b.x,
      b.y + b.height,
      b.x + b.width,
      b.y + b.height
    );
    const left = pointToLineSegmentDist(mx, my, b.x, b.y, b.x, b.y + b.height);
    const right = pointToLineSegmentDist(
      mx,
      my,
      b.x + b.width,
      b.y,
      b.x + b.width,
      b.y + b.height
    );

    return Math.min(top, bottom, left, right) <= PAD;
  }

  if (el.type === "text") return true;

  return false;
}

function shapeToFreehand(el) {
  const points = [];
  const STEP = 5;

  const addLine = (x1, y1, x2, y2) => {
    const steps = Math.max(1, Math.hypot(x2 - x1, y2 - y1) / STEP);
    for (let i = 0; i <= steps; i++) {
      points.push({ x: x1 + (x2 - x1) * (i / steps), y: y1 + (y2 - y1) * (i / steps) });
    }
  };

  if (el.type === "line" || el.type === "arrow") {
    addLine(el.start.x, el.start.y, el.end.x, el.end.y);
    if (el.type === "arrow") {
      const headLength = 15;
      const angle = Math.atan2(el.end.y - el.start.y, el.end.x - el.start.x);
      addLine(el.end.x, el.end.y, el.end.x - headLength * Math.cos(angle - Math.PI / 6), el.end.y - headLength * Math.sin(angle - Math.PI / 6));
      addLine(el.end.x, el.end.y, el.end.x - headLength * Math.cos(angle + Math.PI / 6), el.end.y - headLength * Math.sin(angle + Math.PI / 6));
    }
  } else if (el.type === "rectangle" || el.type === "square") {
    let x1, y1, x2, y2;

    if (el.type === "square") {
      const dx = el.end.x - el.start.x;
      const dy = el.end.y - el.start.y;
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      x1 = dx >= 0 ? el.start.x : el.start.x - side;
      y1 = dy >= 0 ? el.start.y : el.start.y - side;
      x2 = x1 + side;
      y2 = y1 + side;
    } else {
      x1 = Math.min(el.start.x, el.end.x);
      y1 = Math.min(el.start.y, el.end.y);
      x2 = Math.max(el.start.x, el.end.x);
      y2 = Math.max(el.start.y, el.end.y);
    }

    addLine(x1, y1, x2, y1);
    addLine(x2, y1, x2, y2);
    addLine(x2, y2, x1, y2);
    addLine(x1, y2, x1, y1);

  } else if (el.type === "circle") {
    const steps = Math.max(10, (2 * Math.PI * el.radius) / STEP);
    for (let i = 0; i < steps; i++) {
      points.push({ x: el.center.x + el.radius * Math.cos((i / steps) * Math.PI * 2), y: el.center.y + el.radius * Math.sin((i / steps) * Math.PI * 2) });
    }
  } else {
    return el;
  }

  // PRESERVE FILL PROPERTIES WHEN CONVERTING TO FREEHAND!
  return { 
    id: el.id, 
    type: "freehand", 
    color: el.color, 
    size: el.size, 
    points,
    isFilled: el.isFilled,
    fillColor: el.fillColor 
  };
}

function calculateErase(elements, mx, my, brushSize) {
  let modified = false;
  let newElements = [];
  const eraseRadius = brushSize / 2;

  elements.forEach((el) => {
    if (el.type === "text") {
      if (hitTest(el, mx, my)) modified = true;
      else newElements.push(el);
      return;
    }

    let targetEl = el;
    if (el.type !== "freehand") {
      if (hitTest(el, mx, my)) targetEl = shapeToFreehand(el);
      else { newElements.push(el); return; }
    }

    const PAD = eraseRadius + (targetEl.size ? targetEl.size / 2 : 2);
    let currentChunk = [], chunks = [], cut = false;

    for (let i = 0; i < targetEl.points.length; i++) {
      const p = targetEl.points[i];
      let intersects = Math.hypot(p.x - mx, p.y - my) <= PAD;
      if (!intersects && i < targetEl.points.length - 1) {
        if (pointToLineSegmentDist(mx, my, p.x, p.y, targetEl.points[i + 1].x, targetEl.points[i + 1].y) <= PAD) intersects = true;
      }

      if (intersects) {
        cut = true;
        if (currentChunk.length > 0) { chunks.push(currentChunk); currentChunk = []; }
      } else currentChunk.push(p);
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);

    if (cut || el.type !== "freehand") {
      modified = true;
      chunks.forEach((chunk) => {
        if (chunk.length > 1 || (chunk.length === 1 && targetEl.points.length === 1)) {
          newElements.push({ ...targetEl, id: crypto.randomUUID(), points: chunk });
        }
      });
    } else newElements.push(el);
  });

  return { newElements, modified };
}

function getHandles(bounds) {
  const { x, y, width, height } = bounds;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const H = HANDLE_SIZE;
  const positions = [
    { px: x, py: y, cursor: "nwse-resize" },
    { px: cx, py: y, cursor: "ns-resize" },
    { px: x + width, py: y, cursor: "nesw-resize" },
    { px: x + width, py: cy, cursor: "ew-resize" },
    { px: x + width, py: y + height, cursor: "nwse-resize" },
    { px: cx, py: y + height, cursor: "ns-resize" },
    { px: x, py: y + height, cursor: "nesw-resize" },
    { px: x, py: cy, cursor: "ew-resize" },
  ];
  return positions.map((p) => ({ ...p, x: p.px - H, y: p.py - H, size: H * 2 }));
}

function hitHandle(bounds, mx, my) {
  const handles = getHandles(bounds);
  for (let i = 0; i < handles.length; i++) {
    const h = handles[i];
    if (mx >= h.x && mx <= h.x + h.size && my >= h.y && my <= h.y + h.size) return i;
  }
  return -1;
}

function translateElement(el, dx, dy) {
  switch (el.type) {
    case "freehand":
      return {
        ...el,
        points: el.points.map((p) => ({
          x: p.x + dx,
          y: p.y + dy,
        })),
      };
    case "line":
    case "arrow":
      return {
        ...el,
        start: { x: el.start.x + dx, y: el.start.y + dy },
        end: { x: el.end.x + dx, y: el.end.y + dy },
      };
    case "rectangle":
    case "square":
      return {
        ...el,
        start: { x: el.start.x + dx, y: el.start.y + dy },
        end: { x: el.end.x + dx, y: el.end.y + dy },
      };
    case "circle":
      return {
        ...el,
        center: { x: el.center.x + dx, y: el.center.y + dy },
      };
    case "text":
      return {
        ...el,
        x: el.x + dx,
        y: el.y + dy,
      };
    default:
      return el;
  }
}

function resizeElement(el, handleIndex, mx, my) {
  switch (el.type) {
    case "rectangle":
    case "square": {
      let { start, end } = el;
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
      const b = getElementBounds(el);
      if (b.width === 0 || b.height === 0) return el;

      let newRight = b.x + b.width;
      let newBottom = b.y + b.height;

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
      if (el.isFilled) {
        ctx.fillStyle = el.fillColor || el.color;
        ctx.fillRect(x, y, w, h);
      }
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
      if (el.isFilled) {
        ctx.fillStyle = el.fillColor || el.color;
        ctx.fillRect(x, y, side, side);
      }
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.strokeRect(x, y, side, side);
      break;
    }
    case "circle": {
      ctx.beginPath();
      ctx.arc(el.center.x, el.center.y, el.radius, 0, Math.PI * 2);
      if (el.isFilled) {
        ctx.fillStyle = el.fillColor || el.color;
        ctx.fill();
      }
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.stroke();
      break;
    }
    case "freehand": {
      const points = el.points;
      if (!points || points.length === 0) break;

      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, el.size / 2, 0, Math.PI * 2);
        if (el.isFilled) {
          ctx.fillStyle = el.fillColor || el.color;
          ctx.fill();
        }
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        if (el.isFilled) {
          ctx.fillStyle = el.fillColor || el.color;
          ctx.fill();
        }
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }

  if (opts.selected) {
    const b = getElementBounds(el);
    const PAD = 6;

    ctx.save();
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(b.x - PAD, b.y - PAD, b.width + PAD * 2, b.height + PAD * 2);
    ctx.restore();

    const handles = getHandles({
      x: b.x - PAD,
      y: b.y - PAD,
      width: b.width + PAD * 2,
      height: b.height + PAD * 2,
    });

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

function Canvas({ elements, setElements, boardId, cursors }) {
  const canvasRef = useRef(null);

  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState("pen");
  const [isFilled, setIsFilled] = useState(false);
  const [fillColor, setFillColor] = useState("#ef4444");

  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const [selectedId, setSelectedId] = useState(null);

  const isDrawing = useRef(false);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const resizeHandle = useRef(-1);
  const dragStart = useRef(null);
  const elementSnapshot = useRef(null);
  const boardSnapshot = useRef(null);
  const currentStroke = useRef([]);
  const startPoint = useRef(null);

  const [previewShape, setPreviewShape] = useState(null);

  const [editingText, setEditingText] = useState(null);
  const textInputRef = useRef(null);

  const redrawCanvas = useCallback(() => {
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
      drawElement(ctx, { ...previewShape, color, size: brushSize, isFilled, fillColor });
    }
  }, [elements, previewShape, selectedId, brushSize, color, isFilled, fillColor]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const container = canvas.parentElement;
      const width = container ? container.clientWidth : window.innerWidth - 40;

      canvas.width = width;
      canvas.height = Math.max(500, window.innerHeight - 220);
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, [redrawCanvas]);

  useEffect(() => {
    if (editingText && textInputRef.current) textInputRef.current.focus();
  }, [editingText]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !editingText) {
        e.preventDefault();
        const el = elements.find((el) => el.id === selectedId);
        if (!el) return;

        setPast((p) => [...p, elements]);
        setFuture([]);

        const updatedElements = elements.filter((el) => el.id !== selectedId);
        setElements(updatedElements);

        socket.emit("delete-element", { boardId, elements: updatedElements });
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, elements, editingText, boardId]);

  const undo = () => {
    setPreviewShape(null);
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    setFuture((f) => [elements, ...f]);
    setPast(newPast);
    setElements(previous);

    socket.emit("update-elements", { boardId, elements: previous });
  };

  const redo = () => {
    setPreviewShape(null);
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast((p) => [...p, elements]);
    setFuture(newFuture);
    setElements(next);

    socket.emit("update-elements", { boardId, elements: next });
  };

 const getCursor = useCallback((mx, my) => {
  if (tool === "eraser") return "crosshair";
  if (tool === "bucket") return "crosshair";
  if (tool !== "select") return "crosshair";

  if (selectedId) {
    const el = elements.find((e) => e.id === selectedId);
    if (el) {
      const b = getElementBounds(el);
      const PAD = 6;
      const expanded = {
        x: b.x - PAD,
        y: b.y - PAD,
        width: b.width + PAD * 2,
        height: b.height + PAD * 2,
      };

      const hi = hitHandle(expanded, mx, my);
      if (hi >= 0) return getHandles(expanded)[hi].cursor;

      // IMPORTANT FIX:
      // use forceSolid=true so clicking inside hollow shapes still counts
      if (hitTest(el, mx, my, true)) return "move";
    }
  }

  return "default";
}, [tool, selectedId, elements]);

  const getPos = (e) => ({
    x: e.nativeEvent.offsetX,
    y: e.nativeEvent.offsetY,
  });

  const startDrawing = (e) => {
    const { x: mx, y: my } = getPos(e);

    boardSnapshot.current = JSON.stringify(elements);

    if (tool === "bucket") {
      let hit = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        // Pass forceSolid=true so we can click the transparent middle of empty shapes!
        if (hitTest(elements[i], mx, my, true)) {
          hit = elements[i];
          break;
        }
      }
      
      // We now allow bucket to fill freehand shapes too
      if (hit && ["rectangle", "square", "circle", "freehand"].includes(hit.type)) {
        setPast((p) => [...p, elements]);
        setFuture([]);
        const updated = elements.map(el => 
          el.id === hit.id ? { ...el, isFilled: true, fillColor: fillColor } : el
        );
        setElements(updated);
        socket.emit("update-elements", { boardId, elements: updated });
      }
      return;
    }

    if (tool === "eraser") {
      isDrawing.current = true;
      const { newElements, modified } = calculateErase(elements, mx, my, brushSize);
      if (modified) setElements(newElements);
      return;
    }

    if (tool === "select") {
  if (selectedId) {
    const el = elements.find((el) => el.id === selectedId);
    if (el) {
      const b = getElementBounds(el);
      const PAD = 6;
      const expanded = {
        x: b.x - PAD,
        y: b.y - PAD,
        width: b.width + PAD * 2,
        height: b.height + PAD * 2,
      };

      const hi = hitHandle(expanded, mx, my);
      if (hi >= 0) {
        isResizing.current = true;
        resizeHandle.current = hi;
        elementSnapshot.current = el;
        dragStart.current = { x: mx, y: my };
        return;
      }

      // IMPORTANT FIX:
      // use forceSolid=true so clicking anywhere inside shape selects/drags it
      if (hitTest(el, mx, my, true)) {
        isDragging.current = true;
        dragStart.current = { x: mx, y: my };
        elementSnapshot.current = el;
        return;
      }
    }
  }

  let hit = null;
  for (let i = elements.length - 1; i >= 0; i--) {
    // IMPORTANT FIX:
    // use forceSolid=true so hollow shapes are selectable by clicking inside them
    if (hitTest(elements[i], mx, my, true)) {
      hit = elements[i];
      break;
    }
  }

  if (hit) {
    setSelectedId(hit.id);
    isDragging.current = true;
    dragStart.current = { x: mx, y: my };
    elementSnapshot.current = hit;
  } else {
    setSelectedId(null);
  }
  return;
}

    if (tool === "text") {
      const newId = crypto.randomUUID();
      const textEl = {
        id: newId,
        type: "text",
        x: mx,
        y: my,
        text: "",
        color,
        fontSize: 24,
        fontFamily: "Arial",
      };
      setEditingText({
        id: newId,
        x: mx,
        y: my,
        value: "",
        fontSize: 24,
        color,
        isNew: true,
        element: textEl,
      });
      return;
    }

    startPoint.current = { x: mx, y: my };
    currentStroke.current = [{ x: mx, y: my }];
    isDrawing.current = true;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.strokeStyle = color;
  };

  const draw = (e) => {
    const { x: mx, y: my } = getPos(e);

    socket.emit("cursor-move", {
      boardId,
      x: mx,
      y: my,
      name: localStorage.getItem("name") || "User",
    });

    canvasRef.current.style.cursor = getCursor(mx, my);

    if (tool === "bucket") return;

    if (tool === "eraser") {
      if (isDrawing.current) {
        setElements((prev) => {
          const { newElements, modified } = calculateErase(prev, mx, my, brushSize);
          return modified ? newElements : prev;
        });
      }
      return;
    }

    if (isDragging.current && dragStart.current && elementSnapshot.current) {
      const dx = mx - dragStart.current.x;
      const dy = my - dragStart.current.y;
      const updated = translateElement(elementSnapshot.current, dx, dy);
      setElements((prev) =>
        prev.map((el) => (el.id === updated.id ? updated : el))
      );
      return;
    }

    if (isResizing.current && elementSnapshot.current) {
      const updated = resizeElement(
        elementSnapshot.current,
        resizeHandle.current,
        mx,
        my
      );
      setElements((prev) =>
        prev.map((el) => (el.id === updated.id ? updated : el))
      );
      return;
    }

    if (!isDrawing.current) return;

    const shapeTools = ["line", "arrow", "rectangle", "square", "circle"];
    if (shapeTools.includes(tool)) {
      if (tool === "circle") {
        const dx = mx - startPoint.current.x;
        const dy = my - startPoint.current.y;
        setPreviewShape({
          type: "circle",
          center: startPoint.current,
          radius: Math.sqrt(dx * dx + dy * dy),
        });
      } else {
        setPreviewShape({
          type: tool,
          start: startPoint.current,
          end: { x: mx, y: my },
        });
      }
      return;
    }

    currentStroke.current.push({ x: mx, y: my });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(mx, my);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    const { x: mx, y: my } = getPos(e);

    if (tool === "bucket") return;

    if (tool === "eraser") {
      isDrawing.current = false;
      if (boardSnapshot.current && JSON.stringify(elements) !== boardSnapshot.current) {
        setPast((p) => [...p, JSON.parse(boardSnapshot.current)]);
        setFuture([]);
        socket.emit("update-elements", { boardId, elements });
      }
      boardSnapshot.current = null;
      return;
    }

    if (isDragging.current) {
      isDragging.current = false;
      if (boardSnapshot.current && JSON.stringify(elements) !== boardSnapshot.current) {
        setPast((p) => [...p, JSON.parse(boardSnapshot.current)]);
        setFuture([]);
        socket.emit("move-element", { boardId, elements });
      }
      elementSnapshot.current = null;
      dragStart.current = null;
      boardSnapshot.current = null;
      return;
    }

    if (isResizing.current) {
      isResizing.current = false;
      if (boardSnapshot.current && JSON.stringify(elements) !== boardSnapshot.current) {
        setPast((p) => [...p, JSON.parse(boardSnapshot.current)]);
        setFuture([]);
        socket.emit("resize-element", { boardId, elements });
      }
      elementSnapshot.current = null;
      boardSnapshot.current = null;
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    const shapeTools = { line: true, arrow: true, rectangle: true, square: true, circle: true };

    if (shapeTools[tool]) {
      setPast((p) => [...p, elements]);
      setFuture([]);

      let el;
      const base = { id: crypto.randomUUID(), color, size: brushSize };

      if (["rectangle", "square", "circle"].includes(tool)) {
        base.isFilled = isFilled;
        base.fillColor = fillColor;
      }

      if (tool === "circle") {
        const dx = mx - startPoint.current.x;
        const dy = my - startPoint.current.y;
        el = { ...base, type: "circle", center: startPoint.current, radius: Math.sqrt(dx * dx + dy * dy) };
      } else {
        el = { ...base, type: tool, start: startPoint.current, end: { x: mx, y: my } };
      }

      const updated = [...elements, el];
      setElements(updated);
      socket.emit("drawing", { boardId, element: el });

      setPreviewShape(null);
      currentStroke.current = [];
      boardSnapshot.current = null;
      return;
    }

    if (currentStroke.current.length === 0) return;

    setPast((p) => [...p, elements]);
    setFuture([]);

    const stroke = {
      id: crypto.randomUUID(),
      type: "freehand",
      color,
      size: brushSize,
      points: [...currentStroke.current],
    };

    const updated = [...elements, stroke];
    setElements(updated);
    socket.emit("drawing", { boardId, element: stroke });

    currentStroke.current = [];
    boardSnapshot.current = null;
  };

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

  const commitText = () => {
    if (!editingText) return;
    const { id, x, y, value, fontSize, color: tColor, isNew, element } = editingText;
    if (value.trim() === "") {
      if (!isNew) {
        setPast((p) => [...p, elements]);
        setFuture([]);
        const updated = elements.filter((el) => el.id !== id);
        setElements(updated);
        socket.emit("delete-element", { boardId, elements: updated });
      }
    } else if (isNew) {
      const newEl = { ...element, text: value, fontSize, color: tColor };
      setPast((p) => [...p, elements]);
      setFuture([]);
      const updated = [...elements, newEl];
      setElements(updated);
      socket.emit("drawing", { boardId, element: newEl });

    } else {
      setPast((p) => [...p, elements]);
      setFuture([]);
      const updatedElements = elements.map((el) =>
        el.id === id ? { ...el, text: value, fontSize, color: tColor } : el
      );
      setElements(updatedElements);
      socket.emit("update-elements", { boardId, elements: updatedElements });
    }
    setEditingText(null);
  };

  const clearCanvas = () => {
    setPast((p) => [...p, elements]);
    setFuture([]);
    setElements([]);

    socket.emit("clear-board", boardId);
    setPreviewShape(null);
    setSelectedId(null);
    try { localStorage.removeItem(LS_KEY); } catch { }
  };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "whiteboard.png";
    a.click();
  };

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

  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) {
          setPast((p) => [...p, elements]);
          setFuture([]);
          setElements(data);
          setSelectedId(null);
        }
      } catch { alert("Invalid JSON file"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

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

  const tools = ["pen", "eraser", "bucket", "text", "line", "arrow", "rectangle", "square", "circle", "select"];

  return (
    <div style={{ userSelect: "none", fontFamily: "system-ui, sans-serif", width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "10px 12px",
          background: "#f8f9fa",
          borderBottom: "1px solid #ddd",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <button style={btnStyle(false)} onClick={undo} disabled={past.length === 0}>
            ↩ Undo
          </button>

          <button style={btnStyle(false)} onClick={redo} disabled={future.length === 0}>
            ↪ Redo
          </button>

          <span style={{ width: 1, height: 24, background: "#ddd", margin: "0 4px" }} />

          {tools.map((t) => (
            <button
              key={t}
              style={btnStyle(tool === t)}
              onClick={() => {
                setTool(t);
                setSelectedId(null);
              }}
            >
              {{
                pen: "✏️ Pen",
                eraser: "⬜ Eraser",
                bucket: "🪣 Bucket",
                text: "T Text",
                line: "/ Line",
                arrow: "→ Arrow",
                rectangle: "▭ Rect",
                square: "□ Square",
                circle: "○ Circle",
                select: "⬚ Select",
              }[t]}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 500 }}>Size: {brushSize}</span>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{ width: 100 }}
          />

          <span style={{ fontSize: 12, fontWeight: 500 }}>Stroke:</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{
              width: 34,
              height: 28,
              padding: 0,
              border: "1px solid #ccc",
              borderRadius: 4,
              cursor: "pointer",
            }}
          />

          <span style={{ width: 1, height: 24, background: "#ddd", margin: "0 4px" }} />

          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isFilled}
              onChange={(e) => setIsFilled(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            Fill:
          </label>
          <input
            type="color"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            disabled={!isFilled}
            style={{
              width: 34,
              height: 28,
              padding: 0,
              border: "1px solid #ccc",
              borderRadius: 4,
              cursor: isFilled ? "pointer" : "not-allowed",
              opacity: isFilled ? 1 : 0.4,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <button style={{ ...btnStyle(false), color: "#dc2626" }} onClick={clearCanvas}>
            🗑 Clear
          </button>

          <button style={btnStyle(false)} onClick={exportPNG}>
            ⬇ PNG
          </button>

          <button style={btnStyle(false)} onClick={exportJSON}>
            ⬇ JSON
          </button>

          <label
            style={{
              ...btnStyle(false),
              display: "inline-flex",
              alignItems: "center",
              lineHeight: "normal",
              cursor: "pointer",
            }}
          >
            ⬆ Import
            <input
              type="file"
              accept=".json"
              onChange={importJSON}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>

      {selectedId &&
        (() => {
          const sel = elements.find((el) => el.id === selectedId);
          if (!sel) return null;

          if (sel.type === "text") {
            return (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  padding: "4px 10px",
                  background: "#eff6ff",
                  borderBottom: "1px solid #bfdbfe",
                  marginBottom: 4,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>Text options:</span>
                <span style={{ fontSize: 12 }}>Size:</span>
                <input
                  type="number"
                  min="8"
                  max="96"
                  value={sel.fontSize || 24}
                  onChange={(e) => {
                    setPast((p) => [...p, elements]);
                    setFuture([]);
                    const updated = elements.map((el) =>
                        el.id === sel.id ? { ...el, fontSize: Number(e.target.value) } : el
                      );
                    setElements(updated);
                    socket.emit("update-elements", { boardId, elements: updated });
                  }}
                  style={{ width: 52, fontSize: 12, padding: "2px 4px" }}
                />
                <span style={{ fontSize: 12 }}>Color:</span>
                <input
                  type="color"
                  value={sel.color}
                  onChange={(e) => {
                    setPast((p) => [...p, elements]);
                    setFuture([]);
                    const updated = elements.map((el) =>
                        el.id === sel.id ? { ...el, color: e.target.value } : el
                      );
                    setElements(updated);
                    socket.emit("update-elements", { boardId, elements: updated });
                  }}
                  style={{ width: 28, height: 22, padding: 0 }}
                />
                <button
                  style={{ ...btnStyle(false), fontSize: 12, color: "#dc2626" }}
                  onClick={() => {
                    setPast((p) => [...p, elements]);
                    setFuture([]);
                    const updatedElements = elements.filter((el) => el.id !== sel.id);
                    setElements(updatedElements);
                    socket.emit("delete-element", { boardId, elements: updatedElements });
                    setSelectedId(null);
                  }}
                >
                  Delete
                </button>
              </div>
            );
          } else {
            return (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  padding: "4px 10px",
                  background: "#eff6ff",
                  borderBottom: "1px solid #bfdbfe",
                  marginBottom: 4,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>Shape options:</span>

                <span style={{ fontSize: 12 }}>Size:</span>
                <input type="number" min="1" max="20" value={sel.size} onChange={(e) => {
                  setPast((p) => [...p, elements]); setFuture([]);
                  const val = Number(e.target.value);
                  const updated = elements.map(el => el.id === sel.id ? { ...el, size: val } : el);
                  setElements(updated); socket.emit("update-elements", { boardId, elements: updated });
                }} style={{ width: 44, fontSize: 12, padding: "2px 4px" }} />

                <span style={{ fontSize: 12 }}>Stroke:</span>
                <input type="color" value={sel.color} onChange={(e) => {
                  setPast((p) => [...p, elements]); setFuture([]);
                  const updated = elements.map(el => el.id === sel.id ? { ...el, color: e.target.value } : el);
                  setElements(updated); socket.emit("update-elements", { boardId, elements: updated });
                }} style={{ width: 28, height: 22, padding: 0 }} />

                {/* Now supports filling sliced freehand shapes too! */}
                {["rectangle", "square", "circle", "freehand"].includes(sel.type) && (
                  <>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, marginLeft: 8 }}>
                      <input type="checkbox" checked={!!sel.isFilled} onChange={(e) => {
                        setPast((p) => [...p, elements]); setFuture([]);
                        const updated = elements.map(el => el.id === sel.id ? { ...el, isFilled: e.target.checked, fillColor: el.fillColor || color } : el);
                        setElements(updated); socket.emit("update-elements", { boardId, elements: updated });
                      }} /> Fill
                    </label>
                    <input type="color" value={sel.fillColor || color} disabled={!sel.isFilled} onChange={(e) => {
                      setPast((p) => [...p, elements]); setFuture([]);
                      const updated = elements.map(el => el.id === sel.id ? { ...el, fillColor: e.target.value } : el);
                      setElements(updated); socket.emit("update-elements", { boardId, elements: updated });
                    }} style={{ width: 28, height: 22, padding: 0, opacity: sel.isFilled ? 1 : 0.4 }} />
                  </>
                )}

                <div style={{ flexGrow: 1 }} />
                <button style={{ ...btnStyle(false), fontSize: 12, color: "#dc2626" }} onClick={() => {
                  setPast((p) => [...p, elements]); setFuture([]);
                  const updated = elements.filter(el => el.id !== sel.id);
                  setElements(updated); socket.emit("delete-element", { boardId, elements: updated });
                  setSelectedId(null);
                }}>Delete</button>
              </div>
            );
          }
        })()}

      <div style={{ position: "relative", width: "100%" }}>
        <canvas
          ref={canvasRef}
          style={{
            border: "2px solid #d1d5db",
            display: "block",
            width: "100%",
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onDoubleClick={handleDoubleClick}
        />

        {editingText && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: editingText.y - (editingText.fontSize || 24) - 4,
                left: editingText.x - 2,
                pointerEvents: "all",
                background: "rgba(255,255,255,0.9)",
                border: "1.5px dashed #2563eb",
                borderRadius: 3,
                padding: 4,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              }}
            >
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <label style={{ fontSize: 11 }}>
                  Size:
                  <input
                    type="number"
                    min="8"
                    max="96"
                    value={editingText.fontSize}
                    onChange={(e) =>
                      setEditingText((p) => ({
                        ...p,
                        fontSize: Number(e.target.value),
                      }))
                    }
                    style={{ width: 44, marginLeft: 4, fontSize: 11 }}
                  />
                </label>

                <input
                  type="color"
                  value={editingText.color}
                  onChange={(e) =>
                    setEditingText((p) => ({
                      ...p,
                      color: e.target.value,
                    }))
                  }
                  style={{ width: 24, height: 20, padding: 0 }}
                />
              </div>

              <textarea
                ref={textInputRef}
                value={editingText.value}
                rows={2}
                onChange={(e) =>
                  setEditingText((p) => ({
                    ...p,
                    value: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    commitText();
                  }
                  if (e.key === "Escape") setEditingText(null);
                }}
                style={{
                  fontSize: editingText.fontSize,
                  color: editingText.color,
                  fontFamily: "Arial",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  resize: "none",
                  minWidth: 120,
                }}
              />

              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={commitText}
                  style={{ ...btnStyle(true), fontSize: 11, padding: "2px 8px" }}
                >
                  Save
                </button>

                <button
                  onClick={() => setEditingText(null)}
                  style={{ ...btnStyle(false), fontSize: 11, padding: "2px 8px" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {Object.entries(cursors).map(([socketId, cursor]) => (
          <div
            key={socketId}
            style={{
              position: "absolute",
              left: cursor.x,
              top: cursor.y,
              pointerEvents: "none",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-20px",
                left: "8px",
                background: "black",
                color: "white",
                fontSize: "12px",
                padding: "2px 6px",
                borderRadius: "4px",
                whiteSpace: "nowrap",
              }}
            >
              {cursor.name || "User"}
            </div>

            <div
              style={{
                width: "10px",
                height: "10px",
                backgroundColor: "red",
                borderRadius: "50%",
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ padding: "4px 10px", fontSize: 11, color: "#6b7280", marginTop: 4 }}>
        {elements.length} element{elements.length !== 1 ? "s" : ""} on board
        {selectedId ? " · 1 selected" : ""}
      </div>
    </div>
  );
}

export default Canvas;