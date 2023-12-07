import React, { useState, useRef, useEffect } from 'react';

interface Color {
  name: string;
  code: string;
}

interface DrawingPath {
  path: string;
  color: string;
}

const colors: Color[] = [
  { name: "Black", code: "black" },
  { name: "Yellow", code: "yellow" },
  { name: "Red", code: "red" },
  { name: "Blue", code: "blue" },
  { name: "Green", code: "green" }
];

const PdfWriter: React.FC<{
  writing: boolean;
}> = ({ writing }) => {
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [undoHistory, setUndoHistory] = useState<DrawingPath[][]>([]);
  const [redoHistory, setRedoHistory] = useState<DrawingPath[][]>([]);
  const [selectedColor, setSelectedColor] = useState<Color>(colors[0]);
  const [pathCoordinates, setPathCoordinates] = useState<[number, number][]>([]);
  const [rectDims, setRectDims] = useState<DOMRect | null>(null);
  const [scrollPosition, setScrollPosition] = useState<number>(0);

  const drawingRef = useRef<HTMLDivElement>(null);

  const line = (pointA: [number, number], pointB: [number, number]) => {
    const lengthX = pointB[0] - pointA[0];
    const lengthY = pointB[1] - pointA[1];
    return {
      length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
      angle: Math.atan2(lengthY, lengthX),
    };
  };

  const controlPoint = (
    current: [number, number],
    previous: [number, number] | null,
    next: [number, number] | null,
    reverse: boolean
  ) => {
    const p = previous || current;
    const n = next || current;
    const smoothing = 0.2;
    const o = line(p, n);
    const angle = o.angle + (reverse ? Math.PI : 0);
    const length = o.length * smoothing;
    const x = current[0] + Math.cos(angle) * length;
    const y = current[1] + Math.sin(angle) * length;
    return [x, y];
  };

  const bezierCommand = (point: [number, number], i: number, a: [number, number][]) => {
    const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point, false);
    const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
    return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]} `;
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    if (!writing) return;
    const x = event.clientX;
    const y = event.clientY + window.scrollY;
    setCurrentPath(`M ${x} ${y}`);
    setRedoHistory([]); // Clear redo history when a new path is drawn
    setPathCoordinates([[x, y]]);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    setScrollPosition(window.scrollY);
    if (currentPath && drawingRef.current) {
      let x = event.clientX;
      let y = event.clientY + window.scrollY;
      if (rectDims) {
        x -= rectDims.left;
        y += rectDims.top;
      }

      if (
        x >= 0 &&
        y >= 0 &&
        x <= drawingRef.current.offsetWidth &&
        y <= drawingRef.current.offsetHeight
      ) {
        setPathCoordinates([...pathCoordinates, [x, y]]);

        if (pathCoordinates.length >= 3) {
          const len = pathCoordinates.length;
          const pathData = bezierCommand(
            pathCoordinates[len - 1],
            len - 1,
            pathCoordinates
          );
          setCurrentPath((prevPath) => prevPath + pathData);
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (currentPath) {
      setDrawingPaths((prevPaths) => [
        ...prevPaths,
        { path: currentPath, color: selectedColor.code },
      ]);
      setUndoHistory((prevUndoHistory) => [
        ...prevUndoHistory,
        [...drawingPaths],
      ]);
      setCurrentPath('');
      setPathCoordinates([]);
    }
  };

  const handleUndo = () => {
    if (undoHistory.length > 0) {
      const previousPaths = undoHistory[undoHistory.length - 1];
      setUndoHistory((prevUndoHistory) => prevUndoHistory.slice(0, -1));
      setDrawingPaths(previousPaths);
      setRedoHistory((prevRedoHistory) => [
        ...prevRedoHistory,
        [...drawingPaths],
      ]);
    }
  };

  const handleRedo = () => {
    if (redoHistory.length > 0) {
      const nextPaths = redoHistory[redoHistory.length - 1];
      setRedoHistory((prevRedoHistory) => prevRedoHistory.slice(0, -1));
      setDrawingPaths(nextPaths);
      setUndoHistory((prevUndoHistory) => [
        ...prevUndoHistory,
        [...drawingPaths],
      ]);
    }
  };

  useEffect(() => {
    const rect = drawingRef.current?.getBoundingClientRect();
    setRectDims(rect);
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
    }}>
      <div
        className="h-full"
        style={{
          border: '1px solid #ccc',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={drawingRef}
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <g>
            {drawingPaths.map((pathObj, index) => (
              <g
                key={index}
                stroke={pathObj.color}
                fill="none"
                strokeWidth={strokeWidth}
              >
                <path d={pathObj.path} />
              </g>
            ))}
            {currentPath && (
              <g
                stroke={selectedColor.code}
                fill="none"
                strokeWidth={strokeWidth}
              >
                <path d={currentPath} />
              </g>
            )}
          </g>
        </svg>
      </div>
      <div
        className="h-[4rem] w-[8rem] bg-white border-[2px] shadow-xl cursor-pointer hover:scale-[1.01] rounded-md fixed bottom-4 left-4 flex items-center justify-center group"
        style={{
          position: 'fixed',
          bottom: '4px',
          left: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          border: '2px solid #000000',
          boxShadow: '0px 0px 25px rgba(0, 0, 0, 0.1)',
          borderRadius: '10px',
        }}
      >
        <div
          className={`flex items-center gap-4`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <div
            className="w-[2rem] h-[2rem] rounded-full"
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '50%',
              backgroundColor: selectedColor.code,
            }}
          ></div>
          <span>{selectedColor.name}</span>
        </div>
        <div
          className="absolute top-[-400%] flex-col gap-4 bg-white border-[1px] p-4 rounded-2xl hidden group-hover:flex"
          style={{
            position: 'absolute',
            top: '-400%',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            backgroundColor: '#ffffff',
            border: '1px solid #000000',
            padding: '16px',
            borderRadius: '16px',
          }}
        >
          {colors.map((item) => (
            <div
              className="w-[2rem] h-[2rem] rounded-full"
              key={item.name}
              onClick={() => setSelectedColor(item)}
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                backgroundColor: item.code,
              }}
            ></div>
          ))}
        </div>
      </div>
      <div
        className="bg-white shadow-lg rounded-lg fixed top-4 left-4 p-4 flex items-start gap-12 justify-between"
        style={{
          backgroundColor: '#ffffff',
          boxShadow: '0px 0px 25px rgba(0, 0, 0, 0.1)',
          borderRadius: '10px',
          position: 'fixed',
          top: '4px',
          left: '4px',
          padding: '16px',
          display: 'flex',
          alignItems: 'start',
          gap: '12px',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={handleUndo}
          className={`p-2 rounded-md ${
            undoHistory.length === 0
              ? 'hover:bg-gray-300 text-opacity-30'
              : 'hover:bg-green-300'
          }`}
          disabled={undoHistory.length === 0}
          style={{
            padding: '8px',
            borderRadius: '8px',
            backgroundColor:
              undoHistory.length === 0 ? 'transparent' : '#4CAF50',
            color: undoHistory.length === 0 ? 'rgba(0, 0, 0, 0.3)' : '#ffffff',
          }}
        >
          Undo
        </button>
        <button
          onClick={handleRedo}
          className={`hover:bg-green-300 p-2 rounded-md ${
            redoHistory.length === 0
              ? 'hover:bg-gray-300 text-opacity-30'
              : 'hover:bg-green-300'
          }`}
          disabled={redoHistory.length === 0}
          style={{
            padding: '8px',
            borderRadius: '8px',
            backgroundColor:
              redoHistory.length === 0 ? 'transparent' : '#4CAF50',
            color: redoHistory.length === 0 ? 'rgba(0, 0, 0, 0.3)' : '#ffffff',
          }}
        >
          Redo
        </button>
      </div>
    </div>
  );
};

export default PdfWriter;
