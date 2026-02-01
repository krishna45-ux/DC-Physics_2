
// Data extracted from constants.ts for DB Seeding

const CHAPTER_PRICE = 99;

// Helper for videos
const VIDEO_IDS = [
  "x_tNzeouHC4", "7Mv1CfbQf5s", "1xSQlwWGT8Y", "HIjX4k1f8-A", "Hxoaf1j266E", "3Bm3Q_O9Q2A", "T7k52a3Z7G0"
];
const getRandomVideo = (index) => VIDEO_IDS[index % VIDEO_IDS.length];

const CHAPTERS = [
  // Class 12
  {
    id: "c12-1",
    title: "Electric Charges and Fields",
    description: "Electric charges, conservation of charge, Coulomb's law, superposition principle, continuous charge distribution.",
    price: 0, // FREE
    duration: "1h 15m",
    classLevel: 12,
    topics: [
      { id: "c12-1-t1", title: "Electric Charge & Properties", videoUrl: getRandomVideo(0), duration: "15m" },
      { id: "c12-1-t2", title: "Conductors and Insulators", videoUrl: getRandomVideo(1), duration: "10m" },
      { id: "c12-1-t3", title: "Coulomb's Law", videoUrl: getRandomVideo(2), duration: "20m" },
      { id: "c12-1-t4", title: "Electric Field Lines", videoUrl: getRandomVideo(3), duration: "10m" },
      { id: "c12-1-t5", title: "Gauss's Law", videoUrl: getRandomVideo(4), duration: "20m" }
    ]
  },
  {
    id: "c12-2",
    title: "Electrostatic Potential and Capacitance",
    description: "Electric potential, potential difference, equipotential surfaces, electrical potential energy, capacitors and capacitance.",
    price: 0, // FREE
    duration: "1h 30m",
    classLevel: 12,
    topics: [
      { id: "c12-2-t1", title: "Electrostatic Potential", videoUrl: getRandomVideo(5), duration: "15m" },
      { id: "c12-2-t2", title: "Potential due to Point Charge", videoUrl: getRandomVideo(6), duration: "15m" },
      { id: "c12-2-t3", title: "Equipotential Surfaces", videoUrl: getRandomVideo(0), duration: "10m" },
      { id: "c12-2-t4", title: "Capacitors and Capacitance", videoUrl: getRandomVideo(1), duration: "25m" },
      { id: "c12-2-t5", title: "Dielectrics", videoUrl: getRandomVideo(2), duration: "25m" }
    ]
  },
  // Class 11 (Sample)
  {
    id: "c11-1",
    title: "Units and Measurements",
    description: "Need for measurement, units of measurement, systems of units, SI units, fundamental and derived units.",
    price: 0, // FREE
    duration: "55m",
    classLevel: 11,
    topics: [
      { id: "c11-1-t1", title: "SI Units", videoUrl: getRandomVideo(0), duration: "20m" },
      { id: "c11-1-t2", title: "Errors in Measurement", videoUrl: getRandomVideo(1), duration: "20m" },
      { id: "c11-1-t3", title: "Significant Figures", videoUrl: getRandomVideo(2), duration: "15m" }
    ]
  },
  {
    id: "c11-2",
    title: "Motion in a Straight Line",
    description: "Frame of reference, Motion in a straight line, Position-time graph, speed and velocity.",
    price: 0, // FREE
    duration: "1h 10m",
    classLevel: 11,
    topics: [
      { id: "c11-2-t1", title: "Position & Displacement", videoUrl: getRandomVideo(3), duration: "20m" },
      { id: "c11-2-t2", title: "Average Velocity", videoUrl: getRandomVideo(4), duration: "20m" },
      { id: "c11-2-t3", title: "Acceleration", videoUrl: getRandomVideo(5), duration: "15m" },
      { id: "c11-2-t4", title: "Kinematic Equations", videoUrl: getRandomVideo(6), duration: "15m" }
    ]
  }
];

// Sample Quiz Data
const QUIZZES = [
  {
    id: "quiz-c12-1",
    chapterId: "c12-1",
    questions: [
      { id: "q1", text: "What is the SI unit of electric charge?", options: ["Ampere", "Coulomb", "Volt", "Watt"], correctOptionIndex: 1 },
      { id: "q2", text: "Electric field lines always start from?", options: ["Negative charge", "Positive charge", "Infinity", "None"], correctOptionIndex: 1 }
    ]
  }
];

module.exports = { CHAPTERS, QUIZZES };
