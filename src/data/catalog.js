import { ACTIVITIES, LEGACY_GROUP } from './activities';
// ==========================================
// BIBLIOTHÈQUE COMPLÈTE D'EXERCICES (AVEC ABDOMINAUX & COURSE)
// ==========================================
const BASE_EXERCISE_CATALOG = [
  { id: 'pullups', name: 'Tractions Pronation', category: 'Dos', type: 'strength', unit: 'reps', defaultGoalMode: 'sets_reps', defaultStart: 4, defaultGoal: 6, defaultGoalSets: 3, defaultGoalReps: 6, defaultStartAssistance: 15, defaultGoalAssistance: 0, icon: '🦅' },
  { id: 'chinups', name: 'Tractions Supination', category: 'Dos', type: 'strength', unit: 'reps', defaultGoalMode: 'sets_reps', defaultStart: 5, defaultGoal: 8, defaultGoalSets: 3, defaultGoalReps: 8, defaultStartAssistance: 15, defaultGoalAssistance: 0, icon: '🔱' },
  { id: 'lat_pulldown', name: 'Tirage Vertical Poulie Haute', category: 'Dos', type: 'strength', unit: 'kg', defaultGoalMode: 'sets_reps', defaultStart: 35, defaultGoal: 55, defaultGoalSets: 3, defaultGoalReps: 10, defaultStartAssistance: 0, defaultGoalAssistance: 0, icon: '🏹' },
  { id: 'barbell_row', name: 'Rowing Barre Buste Penché', category: 'Dos', type: 'strength', unit: 'kg', defaultGoalMode: 'sets_reps', defaultStart: 40, defaultGoal: 65, defaultGoalSets: 3, defaultGoalReps: 8, defaultStartAssistance: 0, defaultGoalAssistance: 0, icon: '🚣' },
  { id: 'bench_press', name: 'Développé Couché Barre', category: 'Pectoraux', type: 'strength', unit: 'kg', defaultGoalMode: 'sets_reps', defaultStart: 40, defaultGoal: 60, defaultGoalSets: 3, defaultGoalReps: 8, defaultStartAssistance: 0, defaultGoalAssistance: 0, icon: '🏋️' },
  { id: 'incline_dumbbell', name: 'Développé Incliné Haltères', category: 'Pectoraux', type: 'strength', unit: 'kg', defaultGoalMode: 'sets_reps', defaultStart: 14, defaultGoal: 22, defaultGoalSets: 3, defaultGoalReps: 10, defaultStartAssistance: 0, defaultGoalAssistance: 0, icon: '🔥' },
  { id: 'pushups', name: 'Pompes Classiques', category: 'Pectoraux', type: 'strength', unit: 'reps', defaultGoalMode: 'sets_reps', defaultStart: 10, defaultGoal: 20, defaultGoalSets: 3, defaultGoalReps: 20, defaultStartAssistance: 0, defaultGoalAssistance: 0, icon: '🛡️' },
  { id: 'squat', name: 'Squat Barre', category: 'Jambes', type: 'strength', unit: 'kg', defaultGoalMode: 'sets_reps', defaultStart: 50, defaultGoal: 80, defaultGoalSets: 3, defaultGoalReps: 6, defaultStartAssistance: 0, defaultGoalAssistance: 0, icon: '🦵' },
  { id: 'leg_press', name: 'Presse à Cuisses', category: 'Jambes', type: 'strength', unit: 'kg', defaultGoalMode: 'weight_only', defaultStart: 90, defaultGoal: 140, defaultGoalSets: 4, defaultGoalReps: 10, defaultStartAssistance: 0, defaultGoalAssistance: 0, icon: '⚡' },
  { id: 'deadlift', name: 'Soulevé de Terre', category: 'Jambes', type: 'strength', unit: 'kg', defaultGoalMode: 'weight_only', defaultStart: 60, defaultGoal: 100, defaultGoalSets: 3, defaultGoalReps: 5, defaultStartAssistance: 0, defaultGoalAssistance: 0, icon: '🦍' },
  { id: 'dips', name: 'Dips sur Barres Parallèles', category: 'Épaules & Bras', type: 'strength', unit: 'reps', defaultGoalMode: 'sets_reps', defaultStart: 5, defaultGoal: 8, defaultGoalSets: 3, defaultGoalReps: 8, defaultStartAssistance: 10, defaultGoalAssistance: 0, icon: '💎' },
  { id: 'overhead_press', name: 'Développé Militaire', category: 'Épaules & Bras', type: 'strength', unit: 'kg', defaultGoalMode: 'sets_reps', defaultStart: 25, defaultGoal: 45, defaultGoalSets: 3, defaultGoalReps: 8, defaultStartAssistance: 0, defaultGoalAssistance: 0, icon: '⚔️' },
  { id: 'barbell_curl', name: 'Curl Biceps Barre EZ', category: 'Épaules & Bras', type: 'strength', unit: 'kg', defaultGoalMode: 'sets_reps', defaultStart: 20, defaultGoal: 35, defaultGoalSets: 3, defaultGoalReps: 10, defaultStartAssistance: 0, defaultGoalAssistance: 0, icon: '💥' },
  { id: 'crunches_floor', name: 'Crunchs Abdominaux au Sol', category: 'Abdominaux', type: 'strength', unit: 'reps', defaultGoalMode: 'sets_reps', defaultStart: 12, defaultGoal: 20, defaultGoalSets: 3, defaultGoalReps: 20, defaultStartAssistance: 0, defaultGoalAssistance: 0, icon: '🍫' },
  { id: 'hanging_leg_raises', name: 'Relevé de Jambes Suspendu', category: 'Abdominaux', type: 'strength', unit: 'reps', defaultGoalMode: 'sets_reps', defaultStart: 6, defaultGoal: 12, defaultGoalSets: 3, defaultGoalReps: 12, defaultStartAssistance: 0, defaultGoalAssistance: 0, icon: '🦿' },
  { id: 'ab_wheel', name: 'Roue Abdominale (Ab Wheel)', category: 'Abdominaux', type: 'strength', unit: 'reps', defaultGoalMode: 'sets_reps', defaultStart: 5, defaultGoal: 12, defaultGoalSets: 3, defaultGoalReps: 12, defaultStartAssistance: 0, defaultGoalAssistance: 0, icon: '🎡' },
  { id: 'cable_crunch', name: 'Crunch Abdominaux Poulie Haute', category: 'Abdominaux', type: 'strength', unit: 'kg', defaultGoalMode: 'sets_reps', defaultStart: 25, defaultGoal: 45, defaultGoalSets: 3, defaultGoalReps: 15, defaultStartAssistance: 0, defaultGoalAssistance: 0, icon: '⚡' },
  { id: 'running_endurance', name: 'Course à pied (Endurance)', category: 'Course & Cardio', type: 'cardio', unit: 'km', cardioMode: 'run', defaultStart: 3, defaultGoal: 10, defaultDurationMin: 25, defaultElevationM: 30, icon: '🏃' },
  { id: 'running_interval', name: 'Course Fractionné / VMA', category: 'Course & Cardio', type: 'cardio', unit: 'km', cardioMode: 'interval', defaultStart: 3, defaultGoal: 6, defaultDurationMin: 22, defaultElevationM: 20, icon: '⚡' },
  { id: 'brisk_walk', name: 'Marche Active / Randonnée', category: 'Course & Cardio', type: 'cardio', unit: 'km', cardioMode: 'walk', defaultStart: 4, defaultGoal: 12, defaultDurationMin: 50, defaultElevationM: 120, icon: '🥾' },
  { id: 'incline_walk', name: 'Marche Inclinée (Tapis)', category: 'Course & Cardio', type: 'cardio', unit: 'min', cardioMode: 'incline_walk', defaultStart: 15, defaultGoal: 45, defaultDurationMin: 20, defaultElevationM: 180, icon: '⛰️' },
{ id: 'volleyball', name: 'Volley-ball', category: 'Volley-ball', type: 'cardio', unit: 'min', cardioMode: 'volleyball', defaultStart: 60, defaultGoal: 120, defaultDurationMin: 60, defaultElevationM: 0, icon: '🏐' }
];

// ------------------------------------------------------------------
// CATALOGUE ÉTENDU (machines Technogym / Hammer Strength, charges libres, poulies, Smith, poids du corps, cardio)
// Format : [id, nom, catégorie, équipement, unité, départ, objectif, séries, reps, icône, mode?, aide de départ (kg)?]
// ------------------------------------------------------------------
const NEW_STRENGTH_ROWS = [
  // DOS
  ['fp_seated_row','Tirage Horizontal Poulie Basse','Dos','Poulie','kg',35,60,3,10,'🚣'],
  ['fp_low_row_machine','Low Row Machine Assise','Dos','Machine guidée','kg',35,65,3,10,'🛶'],
  ['fp_hammer_row','Rowing Iso-Latéral (Hammer Strength)','Dos','Hammer Strength','kg',40,90,3,10,'🦍'],
  ['fp_tbar_row','Rowing T-Bar','Dos','Barre','kg',30,70,3,10,'🔱'],
  ['fp_db_row','Rowing Haltère Unilatéral','Dos','Haltères','kg',14,30,3,10,'💪'],
  ['fp_vertical_traction','Traction Verticale Machine (Vertical Traction)','Dos','Machine guidée','kg',35,70,3,10,'🏹'],
  ['fp_hammer_pulldown','Tirage Vertical Hammer Strength','Dos','Hammer Strength','kg',30,80,3,10,'🏹'],
  ['fp_close_pulldown','Tirage Poitrine Prise Serrée','Dos','Poulie','kg',35,60,3,10,'🏹'],
  ['fp_straight_arm_pd','Pull-over Poulie Haute (Bras Tendus)','Dos','Poulie','kg',15,35,3,12,'🌊'],
  ['fp_assisted_pullup','Traction Assistée Machine','Dos','Machine guidée','reps',5,8,3,8,'🦅','sets_reps',40],
  ['fp_back_extension','Extensions Lombaires (Banc 45°)','Dos','Poids du corps','reps',10,20,3,15,'🧗'],
  ['fp_lumbar_machine','Extension Lombaires Machine','Dos','Machine guidée','kg',20,50,3,12,'🧗'],
  ['fp_shrugs_db','Shrugs Haltères (Trapèzes)','Dos','Haltères','kg',20,40,3,12,'🗻'],
  ['fp_shrugs_bar','Shrugs Barre (Trapèzes)','Dos','Barre','kg',40,80,3,12,'🗻'],
  ['fp_inverted_row','Rowing Inversé (Barre Basse Smith)','Dos','Smith','reps',6,12,3,12,'🪂'],
  // PECTORAUX
  ['fp_db_bench','Développé Couché Haltères','Pectoraux','Haltères','kg',18,34,3,10,'🏋️'],
  ['fp_incline_barbell','Développé Incliné Barre','Pectoraux','Barre','kg',30,65,3,8,'🔥'],
  ['fp_decline_barbell','Développé Décliné Barre','Pectoraux','Barre','kg',40,75,3,8,'🔥'],
  ['fp_smith_bench','Développé Couché Smith Machine','Pectoraux','Smith','kg',40,80,3,8,'🏋️'],
  ['fp_smith_incline','Développé Incliné Smith Machine','Pectoraux','Smith','kg',30,65,3,8,'🔥'],
  ['fp_chest_press','Chest Press Machine Assise','Pectoraux','Machine guidée','kg',30,75,3,10,'🛡️'],
  ['fp_hammer_chest','Chest Press Iso-Latéral (Hammer Strength)','Pectoraux','Hammer Strength','kg',40,90,3,10,'🛡️'],
  ['fp_hammer_incline','Développé Incliné Hammer Strength','Pectoraux','Hammer Strength','kg',40,90,3,10,'🛡️'],
  ['fp_pec_deck','Pec Deck (Butterfly Machine)','Pectoraux','Machine guidée','kg',30,60,3,12,'🦋'],
  ['fp_cable_fly','Écartés Poulie Vis-à-Vis (Crossover)','Pectoraux','Poulie','kg',10,25,3,12,'🦋'],
  ['fp_db_fly','Écartés Haltères sur Banc','Pectoraux','Haltères','kg',8,18,3,12,'🦋'],
  ['fp_incline_fly','Écartés Inclinés Haltères','Pectoraux','Haltères','kg',8,16,3,12,'🦋'],
  ['fp_db_pullover','Pull-over Haltère','Pectoraux','Haltères','kg',14,28,3,10,'🌊'],
  ['fp_decline_pushups','Pompes Pieds Surélevés','Pectoraux','Poids du corps','reps',8,20,3,15,'🛡️'],
  ['fp_diamond_pushups','Pompes Diamant','Pectoraux','Poids du corps','reps',6,15,3,12,'💎'],
  // JAMBES
  ['fp_smith_squat','Squat Smith Machine','Jambes','Smith','kg',40,90,3,8,'🦵'],
  ['fp_front_squat','Front Squat Barre','Jambes','Barre','kg',30,70,3,6,'🦵'],
  ['fp_goblet','Squat Goblet (Haltère / Kettlebell)','Jambes','Kettlebell','kg',12,32,3,12,'🏺'],
  ['fp_bulgarian','Squat Bulgare Haltères','Jambes','Haltères','kg',8,22,3,8,'🇧🇬'],
  ['fp_hack_squat','Hack Squat Machine','Jambes','Machine à plaques','kg',40,120,3,10,'⚡'],
  ['fp_leg_press_h','Presse à Cuisses Horizontale','Jambes','Machine guidée','kg',60,140,3,10,'⚡'],
  ['fp_leg_press_45','Presse à Cuisses 45° (Plaques)','Jambes','Hammer Strength','kg',100,220,3,10,'⚡'],
  ['fp_leg_ext','Leg Extension (Quadriceps)','Jambes','Machine guidée','kg',25,65,3,12,'🦿'],
  ['fp_leg_curl_seat','Leg Curl Assis (Ischio-jambiers)','Jambes','Machine guidée','kg',25,60,3,12,'🦿'],
  ['fp_leg_curl_lying','Leg Curl Allongé (Ischio-jambiers)','Jambes','Machine guidée','kg',20,55,3,12,'🦿'],
  ['fp_adductors','Adducteurs Machine','Jambes','Machine guidée','kg',30,70,3,15,'🦵'],
  ['fp_abductors','Abducteurs Machine','Jambes','Machine guidée','kg',30,70,3,15,'🦵'],
  ['fp_calf_press','Mollets à la Presse','Jambes','Machine guidée','kg',50,120,3,15,'🐐'],
  ['fp_calf_standing','Mollets Debout Machine','Jambes','Machine guidée','kg',40,100,3,15,'🐐'],
  ['fp_calf_seated','Mollets Assis Machine','Jambes','Machine guidée','kg',30,80,3,15,'🐐'],
  ['fp_walking_lunge','Fentes Marchées Haltères','Jambes','Haltères','kg',8,22,3,10,'🚶'],
  ['fp_barbell_lunge','Fentes Barre','Jambes','Barre','kg',20,55,3,8,'🚶'],
  ['fp_rdl','Soulevé de Terre Roumain','Jambes','Barre','kg',40,100,3,8,'🦍'],
  ['fp_sumo','Soulevé de Terre Sumo','Jambes','Barre','kg',60,120,3,5,'🦍'],
  ['fp_trapbar','Soulevé de Terre Trap Bar','Jambes','Barre','kg',60,130,3,5,'🦍'],
  ['fp_hip_thrust_bar','Hip Thrust Barre','Jambes','Barre','kg',40,110,3,10,'🍑'],
  ['fp_hip_thrust_machine','Hip Thrust Machine','Jambes','Machine guidée','kg',40,110,3,10,'🍑'],
  ['fp_glute_kickback','Kickback Fessiers Poulie','Jambes','Poulie','kg',10,25,3,12,'🍑'],
  ['fp_glute_bridge','Pont Fessier (Glute Bridge)','Jambes','Poids du corps','reps',12,25,3,20,'🍑'],
  ['fp_multihip','Multi-Hanche (Multi-Hip) Machine','Jambes','Machine guidée','kg',15,40,3,12,'🍑'],
  ['fp_good_morning','Good Morning Barre','Jambes','Barre','kg',20,55,3,10,'🌅'],
  ['fp_step_up','Step-Up Haltères','Jambes','Haltères','kg',8,22,3,10,'🪜'],
  ['fp_wall_ball','Wall Ball (HYROX)','Jambes','Ballon lesté','kg',6,9,3,20,'🏐'],
  ['fp_burpees','Burpees','Jambes','Poids du corps','reps',10,25,3,15,'🔥'],
  // ÉPAULES & BRAS
  ['fp_db_shoulder','Développé Épaules Haltères Assis','Épaules & Bras','Haltères','kg',12,28,3,10,'⚔️'],
  ['fp_machine_shoulder','Développé Épaules Machine','Épaules & Bras','Machine guidée','kg',25,60,3,10,'⚔️'],
  ['fp_hammer_shoulder','Développé Épaules Hammer Strength','Épaules & Bras','Hammer Strength','kg',30,80,3,10,'⚔️'],
  ['fp_smith_shoulder','Développé Militaire Smith Machine','Épaules & Bras','Smith','kg',20,55,3,8,'⚔️'],
  ['fp_arnold','Développé Arnold','Épaules & Bras','Haltères','kg',10,24,3,10,'🧔'],
  ['fp_lateral_db','Élévations Latérales Haltères','Épaules & Bras','Haltères','kg',6,16,3,12,'🕊️'],
  ['fp_lateral_machine','Élévations Latérales Machine','Épaules & Bras','Machine guidée','kg',15,40,3,12,'🕊️'],
  ['fp_lateral_cable','Élévations Latérales Poulie','Épaules & Bras','Poulie','kg',4,12,3,12,'🕊️'],
  ['fp_front_raise','Élévations Frontales Haltères','Épaules & Bras','Haltères','kg',6,14,3,12,'🕊️'],
  ['fp_rear_fly_db','Oiseau Haltères (Deltoïdes Postérieurs)','Épaules & Bras','Haltères','kg',5,14,3,12,'🦜'],
  ['fp_reverse_pec_deck','Oiseau Machine (Reverse Pec Deck)','Épaules & Bras','Machine guidée','kg',20,50,3,12,'🦜'],
  ['fp_face_pull','Face Pull Poulie','Épaules & Bras','Poulie','kg',15,35,3,15,'🎯'],
  ['fp_upright_row','Tirage Menton Barre EZ','Épaules & Bras','Barre','kg',15,40,3,10,'🪝'],
  ['fp_ext_rotation','Rotation Externe Poulie (Coiffe)','Épaules & Bras','Poulie','kg',3,10,3,15,'🔄'],
  ['fp_db_curl','Curl Haltères Alterné','Épaules & Bras','Haltères','kg',8,20,3,10,'💥'],
  ['fp_hammer_curl','Curl Marteau','Épaules & Bras','Haltères','kg',8,20,3,10,'🔨'],
  ['fp_preacher_bar','Curl Pupitre Barre EZ','Épaules & Bras','Barre','kg',15,40,3,10,'💥'],
  ['fp_preacher_machine','Curl Pupitre Machine','Épaules & Bras','Machine guidée','kg',15,45,3,10,'💥'],
  ['fp_cable_curl','Curl Poulie Basse','Épaules & Bras','Poulie','kg',15,40,3,12,'💥'],
  ['fp_incline_curl','Curl Incliné Haltères','Épaules & Bras','Haltères','kg',6,16,3,10,'💥'],
  ['fp_concentration_curl','Curl Concentré','Épaules & Bras','Haltères','kg',8,18,3,10,'💥'],
  ['fp_biceps_machine','Biceps Curl Machine','Épaules & Bras','Machine guidée','kg',20,55,3,12,'💥'],
  ['fp_pushdown','Extension Triceps Poulie Haute (Corde)','Épaules & Bras','Poulie','kg',15,45,3,12,'🔻'],
  ['fp_pushdown_bar','Extension Triceps Poulie Barre Droite','Épaules & Bras','Poulie','kg',15,50,3,12,'🔻'],
  ['fp_skull','Barre au Front (Skull Crusher)','Épaules & Bras','Barre','kg',15,40,3,10,'💀'],
  ['fp_overhead_ext_db','Extension Triceps Nuque Haltère','Épaules & Bras','Haltères','kg',10,28,3,10,'🔻'],
  ['fp_overhead_ext_cable','Extension Triceps Nuque Poulie','Épaules & Bras','Poulie','kg',15,40,3,12,'🔻'],
  ['fp_kickback','Kickback Triceps Haltère','Épaules & Bras','Haltères','kg',4,14,3,12,'🔻'],
  ['fp_triceps_machine','Triceps Extension Machine','Épaules & Bras','Machine guidée','kg',20,60,3,12,'🔻'],
  ['fp_close_grip_bench','Développé Couché Prise Serrée','Épaules & Bras','Barre','kg',30,70,3,8,'🔻'],
  ['fp_dip_machine','Dips Machine Assise','Épaules & Bras','Machine guidée','kg',30,70,3,10,'💎'],
  ['fp_bench_dips','Dips sur Banc','Épaules & Bras','Poids du corps','reps',8,20,3,15,'💎'],
  ['fp_wrist_curl','Curl Poignets (Avant-Bras)','Épaules & Bras','Barre','kg',10,30,3,15,'✊'],
  // ABDOMINAUX
  ['fp_ab_machine','Crunch Machine (Abdominal Crunch)','Abdominaux','Machine guidée','kg',20,60,3,15,'🍫'],
  ['fp_captain_knee','Relevé de Genoux Chaise Romaine','Abdominaux','Poids du corps','reps',8,15,3,12,'🦿'],
  ['fp_toes_to_bar','Toes to Bar','Abdominaux','Poids du corps','reps',3,10,3,8,'🦿'],
  ['fp_plank','Gainage Planche (en secondes)','Abdominaux','Poids du corps','reps',30,90,3,60,'🧱'],
  ['fp_side_plank','Gainage Latéral (en secondes)','Abdominaux','Poids du corps','reps',20,60,3,45,'🧱'],
  ['fp_hollow_hold','Hollow Body Hold (en secondes)','Abdominaux','Poids du corps','reps',15,45,3,30,'🍫'],
  ['fp_wall_sit','Chaise Murale / Wall Sit (en secondes)','Jambes','Poids du corps','reps',30,90,3,60,'🪑'],
  ['fp_dead_hang','Suspension à la Barre / Dead Hang (en secondes)','Dos','Poids du corps','reps',20,60,3,45,'🪝'],
  ['fp_superman_hold','Superman Hold Lombaires (en secondes)','Dos','Poids du corps','reps',20,45,3,30,'🦸'],
  ['fp_mountain','Mountain Climbers','Abdominaux','Poids du corps','reps',20,50,3,30,'⛰️'],
  ['fp_reverse_crunch','Crunch Inversé','Abdominaux','Poids du corps','reps',10,20,3,15,'🍫'],
  ['fp_leg_raise_floor','Relevé de Jambes au Sol','Abdominaux','Poids du corps','reps',10,20,3,15,'🍫'],
  ['fp_situp','Sit-Ups','Abdominaux','Poids du corps','reps',12,25,3,20,'🍫'],
  ['fp_decline_crunch','Crunch Décliné (Banc)','Abdominaux','Banc','reps',10,20,3,15,'🍫'],
  // MACHINES DES GRANDES MARQUES (Technogym, Life Fitness, Hammer Strength, Matrix, Gym80, BH, Bodytone…) : une seule entrée par mouvement
  ['fp_rotary_torso','Rotary Torso (Rotation du Buste, machine)','Abdominaux','Machine guidée','kg',20,50,3,15,'🌀'],
  ['fp_pullover_machine','Pull-over Machine','Dos','Machine guidée','kg',20,50,3,12,'🌊'],
  ['fp_high_row','High Row Iso-Latéral (Tirage Haut, machine)','Dos','Hammer Strength','kg',30,80,3,10,'🦍'],
  ['fp_shrug_machine','Shrug Machine (Trapèzes)','Dos','Hammer Strength','kg',40,140,3,12,'🗻'],
  ['fp_decline_press_machine','Développé Décliné Machine (Iso-Latéral)','Pectoraux','Hammer Strength','kg',40,100,3,10,'🛡️'],
  ['fp_assisted_dip','Dips Assistés Machine','Épaules & Bras','Machine guidée','reps',4,10,3,10,'💎','sets_reps',40],
  ['fp_standing_leg_curl','Leg Curl Debout (machine)','Jambes','Machine guidée','kg',15,40,3,12,'🦿'],
  ['fp_belt_squat','Belt Squat (Squat à la Ceinture, machine)','Jambes','Hammer Strength','kg',40,140,3,10,'🦵'],
  ['fp_deadlift_machine','Soulevé de Terre Machine (Deadlift)','Jambes','Hammer Strength','kg',40,120,3,8,'🦍'],
  ['fp_woodchop','Bûcheron Poulie (Woodchop)','Abdominaux','Poulie','kg',8,25,3,12,'🪓'],
  ['fp_pallof','Pallof Press Poulie (Anti-Rotation)','Abdominaux','Poulie','kg',8,25,3,12,'🧱'],
  ['hs_oblique_crunch','Abdominal / Oblique Crunch (Hammer Strength)','Abdominaux','Machine guidée','kg',20,50,3,15,'🌪️'],
  ['tg_total_abdominal','Total Abdominal (Technogym)','Abdominaux','Machine guidée','kg',20,60,3,15,'🍫'],
  // HALTÉROPHILIE (repères de charges : Catalyst Athletics / G. Everett — arraché ≈ 78-83 % de l'épaulé-jeté, squat arrière ≈ 125-135 % de l'épaulé)
  ['wl_clean_jerk','Épaulé-Jeté (Clean & Jerk)','Jambes','Barre','kg',30,60,5,2,'🏋️'],
  ['wl_snatch','Arraché (Snatch)','Jambes','Barre','kg',25,50,5,2,'🏋️'],
  ['wl_clean','Épaulé (Squat Clean)','Jambes','Barre','kg',35,65,5,2,'🏋️'],
  ['wl_power_clean','Épaulé en Puissance (Power Clean)','Jambes','Barre','kg',35,65,5,3,'🏋️'],
  ['wl_hang_clean','Épaulé Suspendu (Hang Clean)','Jambes','Barre','kg',30,60,4,3,'🏋️'],
  ['wl_power_snatch','Arraché en Puissance (Power Snatch)','Jambes','Barre','kg',25,45,5,3,'🏋️'],
  ['wl_hang_snatch','Arraché Suspendu (Hang Snatch)','Jambes','Barre','kg',20,40,4,3,'🏋️'],
  ['wl_muscle_snatch','Muscle Snatch','Épaules & Bras','Barre','kg',20,35,4,5,'🏋️'],
  ['wl_push_press','Push Press','Épaules & Bras','Barre','kg',30,55,4,5,'⚔️'],
  ['wl_push_jerk','Jeté Poussé (Push Jerk)','Épaules & Bras','Barre','kg',35,60,5,3,'⚔️'],
  ['wl_split_jerk','Jeté Fente (Split Jerk)','Épaules & Bras','Barre','kg',35,65,5,2,'⚔️'],
  ['wl_overhead_squat','Squat Bras Tendus (Overhead Squat)','Jambes','Barre','kg',20,45,4,5,'🦵'],
  ['wl_snatch_balance','Snatch Balance','Jambes','Barre','kg',20,45,4,3,'🦵'],
  ['wl_clean_pull','Tirage d’Épaulé (Clean Pull)','Jambes','Barre','kg',50,90,4,3,'🦍'],
  ['wl_snatch_pull','Tirage d’Arraché (Snatch Pull)','Jambes','Barre','kg',40,75,4,3,'🦍'],
  ['wl_high_pull','Tirage Haut Barre (High Pull)','Dos','Barre','kg',30,55,4,5,'🦍'],
  // HYROX (charges de course : femmes open / hommes open — traîneau poussé 102 / 152 kg, tiré 78 / 103 kg, fermier 2 × 16 / 2 × 24 kg, sac 10 / 20 kg)
  ['hx_sled_push','Poussée de Traîneau (HYROX, par 25 m)','Jambes','Traîneau','kg',60,152,4,1,'🛷','weight_only'],
  ['hx_sled_pull','Tirage de Traîneau à la Corde (HYROX, par 25 m)','Dos','Traîneau','kg',50,103,4,1,'🛷','weight_only'],
  ['hx_farmers_carry','Marche du Fermier (HYROX, par 50 m, charge par main)','Épaules & Bras','Haltères','kg',12,24,4,1,'💪','weight_only'],
  ['hx_sandbag_lunges','Fentes Sac de Sable (HYROX, par 25 m)','Jambes','Sac lesté','kg',10,20,4,1,'🦵','weight_only'],
  ['hx_burpee_broad_jump','Burpee Saut en Longueur (HYROX)','Jambes','Poids du corps','reps',8,20,3,10,'🔥'],
  // CALISTHÉNIE
  ['cal_muscle_up','Muscle-Up Barre','Dos','Poids du corps','reps',1,5,3,3,'🦍'],
  ['cal_ring_muscle_up','Muscle-Up aux Anneaux','Dos','Poids du corps','reps',1,5,3,3,'🤸'],
  ['cal_ring_dips','Dips aux Anneaux','Épaules & Bras','Poids du corps','reps',3,10,3,8,'🤸'],
  ['cal_hspu','Pompes en Équilibre (Handstand Push-Up)','Épaules & Bras','Poids du corps','reps',2,10,3,5,'🤸'],
  ['cal_handstand','Équilibre sur les Mains / Poirier (en secondes)','Épaules & Bras','Poids du corps','reps',10,60,3,30,'🤸'],
  ['cal_l_sit','L-Sit (en secondes)','Abdominaux','Poids du corps','reps',8,30,3,15,'🪑'],
  ['cal_front_lever','Front Lever (en secondes)','Dos','Poids du corps','reps',3,15,4,8,'🦅'],
  ['cal_planche','Planche Calisthénie (en secondes)','Épaules & Bras','Poids du corps','reps',3,15,4,8,'🤸'],
  ['cal_pistol','Pistol Squat (une jambe)','Jambes','Poids du corps','reps',3,10,3,6,'🦵'],
  ['cal_archer_pullup','Tractions Archer','Dos','Poids du corps','reps',2,8,3,5,'🏹'],
  ['cal_archer_pushup','Pompes Archer','Pectoraux','Poids du corps','reps',4,12,3,8,'🏹'],
  ['cal_pseudo_planche','Pompes Pseudo-Planche','Épaules & Bras','Poids du corps','reps',5,15,3,10,'🤸'],
  ['cal_dragon_flag','Dragon Flag','Abdominaux','Poids du corps','reps',3,10,3,6,'🐉'],
];

const mkCardio = (id, name, unit, mode, start, goal, dur, icon) => ({
  id, name, category: 'Course & Cardio', type: 'cardio', unit, cardioMode: mode, equip: 'Cardio',
  defaultStart: start, defaultGoal: goal, defaultDurationMin: dur, defaultElevationM: 0, icon
});

const NEW_CARDIO = [
  mkCardio('fp_bike', 'Vélo Stationnaire / Biking', 'min', 'bike', 20, 60, 30, '🚴'),
  mkCardio('fp_assault_bike', 'Assault Bike', 'min', 'assault_bike', 10, 30, 15, '🌬️'),
  mkCardio('fp_elliptical', 'Vélo Elliptique (Cross-Trainer)', 'min', 'elliptical', 20, 45, 30, '🌀'),
  mkCardio('fp_rower', 'Rameur', 'km', 'rower', 2, 6, 20, '🚣'),
  mkCardio('fp_stairs', 'Stairmaster / Escalier', 'min', 'stairs', 10, 30, 15, '🪜'),
  mkCardio('fp_skierg', 'Ski-Erg (HYROX)', 'km', 'skierg', 1, 3, 10, '⛷️'),
  mkCardio('fp_jumprope', 'Corde à Sauter', 'min', 'jumprope', 5, 15, 10, '🪢'),
  mkCardio('fp_hiit', 'Cross-Training / HIIT', 'min', 'hiit', 15, 40, 25, '🔥'),
  mkCardio('fp_boxing', 'Boxe / Sac de Frappe', 'min', 'boxing', 15, 45, 30, '🥊'),
  mkCardio('fp_treadmill', 'Tapis de Course (Treadmill)', 'km', 'run', 3, 10, 30, '🏃'),
  mkCardio('fp_recumbent', 'Vélo Semi-Allongé (Recumbent)', 'min', 'bike', 20, 60, 30, '🚴'),
  mkCardio('fp_climbmill', 'Climbmill / Échelle (Jacob’s Ladder)', 'min', 'stairs', 5, 20, 10, '🪜'),
  ...ACTIVITIES.map(a => ({ ...mkCardio(a.id, a.name, a.unit, a.mode, a.start, a.goal, a.dur, a.icon), group: a.group })),
  mkCardio('fp_group_class', 'Cours Collectif', 'min', 'group_class', 30, 60, 45, '🧑‍🤝‍🧑')
];

export const normSearch = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const __existingNames = new Set(BASE_EXERCISE_CATALOG.map(c => normSearch(c.name)));

export const EXERCISE_CATALOG = [
  ...BASE_EXERCISE_CATALOG,
  ...NEW_STRENGTH_ROWS.map(r => ({
    id: r[0], name: r[1], category: r[2], equip: r[3], type: 'strength', unit: r[4],
    defaultGoalMode: r[10] || 'sets_reps', defaultStart: r[5], defaultGoal: r[6],
    defaultGoalSets: r[7], defaultGoalReps: r[8], defaultStartAssistance: r[11] || 0,
    defaultGoalAssistance: 0, icon: r[9]
  })),
  ...NEW_CARDIO
].filter((c, i, arr) => i < BASE_EXERCISE_CATALOG.length || !__existingNames.has(normSearch(c.name)));

// Marques d'équipementiers par type de machine (sert à la recherche : « technogym », « hammer », « matrix »…).
// Source : sites des fabricants et des enseignes (Basic-Fit : Matrix + Technogym ; Fitness Park : Technogym, Hammer Strength, Gym80 ;
// L'Orange Bleue : BH + Bodytone). Une machine existe souvent chez plusieurs marques : une seule entrée générique par mouvement.
const BRANDS_BY_EQUIP = {
  'Machine guidée': 'Technogym Selection Matrix Life Fitness BH Bodytone Hammer Strength Select',
  'Hammer Strength': 'Hammer Strength Technogym Pure Gym80 plaques',
  'Machine à plaques': 'Hammer Strength Technogym Pure Gym80 plaques',
  Poulie: 'Technogym Matrix Life Fitness BH Bodytone poulie',
  Smith: 'Technogym Matrix Hammer Strength Gym80 Smith',
  Cardio: 'Technogym Matrix Life Fitness cardio',
};
const BRANDS_BY_ID = { hs_oblique_crunch: 'Hammer Strength plaques', tg_total_abdominal: 'Technogym Selection' };
EXERCISE_CATALOG.forEach(e => {
  e.brands = BRANDS_BY_ID[e.id] || BRANDS_BY_EQUIP[e.equip] || '';
  if (e.type === 'cardio' && !e.group) e.group = LEGACY_GROUP[e.id] || 'Cardio salle & cours';
});
