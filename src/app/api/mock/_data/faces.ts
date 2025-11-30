// app/api/mock/_data/faces.ts

export const BEFORE_FACE_BOXES: Record<string, any> = {
  "0001": {
    width: 1000,
    height: 750,
    faces: [
      { x: 479, y: 316, w: 69, h: 94 }
    ]
  },

  "0002": {
    width: 800,
    height: 1067,
    faces: [
      { x: 234, y: 499, w: 81, h: 118 }
    ]
  },

  "2981": {
    width: 1080,
    height: 720,
    faces: [
      { x: 838, y: 264, w: 117, h: 154 },
      { x: 631, y: 432, w: 31, h: 38 }
    ]
  },
};

// AFTER 이미 존재
export const AFTER_FACE_BOXES: Record<string, any> = {
  "0001": {
    width: 4000,
    height: 3000,
    faces: [
      { x: 1915, y: 1263, w: 274, h: 377 }
    ]
  },

  "0002": {
    width: 3200,
    height: 4268,
    faces: [
      { x: 934, y: 1994, w: 322, h: 473 }
    ]
  },

  "2981": {
    width: 4320,
    height: 2880,
    faces: [
      { x: 3350, y: 1054, w: 468, h: 616 },
      { x: 2522, y: 1727, w: 122, h: 151 },
      { x: 2804, y: 1568, w: 116, h: 150 },
      { x: 2142, y: 1709, w: 53, h: 67 },
      { x: 1955, y: 1757, w: 57, h: 78 }
    ]
  },
};
