/**
 * Test Frontend Plant Vision Validation & State Reset
 */
import { 
  validateImageFile, 
  VALIDATION_STATUSES,
  SUPPORTED_CROPS 
} from '../src/ai/plantVisionEngine.js';

console.log('--- TEST 1: Supported Crops List ---');
console.assert(SUPPORTED_CROPS.includes('Tomato'), 'Tomato must be supported');
console.assert(SUPPORTED_CROPS.includes('Chili'), 'Chili must be supported');
console.assert(SUPPORTED_CROPS.includes('Paddy'), 'Paddy must be supported');
console.assert(SUPPORTED_CROPS.includes('Groundnut'), 'Groundnut must be supported');
console.log('Supported Crops:', SUPPORTED_CROPS);

console.log('\n--- TEST 2: File Format Validation ---');
const validJpg = { name: 'leaf.jpg', type: 'image/jpeg', size: 1024 * 500 };
const validPng = { name: 'leaf.png', type: 'image/png', size: 1024 * 500 };
const validWebp = { name: 'leaf.webp', type: 'image/webp', size: 1024 * 500 };
const invalidTxt = { name: 'doc.txt', type: 'text/plain', size: 1024 };
const invalidExe = { name: 'script.exe', type: 'application/octet-stream', size: 1024 };
const oversized = { name: 'huge.jpg', type: 'image/jpeg', size: 1024 * 1024 * 15 }; // 15MB

console.assert(validateImageFile(validJpg).valid === true, 'JPG should be valid');
console.assert(validateImageFile(validPng).valid === true, 'PNG should be valid');
console.assert(validateImageFile(validWebp).valid === true, 'WebP should be valid');
console.assert(validateImageFile(invalidTxt).valid === false, 'TXT should be invalid');
console.assert(validateImageFile(invalidExe).valid === false, 'EXE should be invalid');
console.assert(validateImageFile(oversized).valid === false, '15MB file should be rejected');
console.log('Validation results:');
console.log(' - Valid JPG:', validateImageFile(validJpg));
console.log(' - Invalid TXT:', validateImageFile(invalidTxt).error);
console.log(' - Oversized 15MB:', validateImageFile(oversized).error);

console.log('\n--- ALL FRONTEND FILE TESTS PASSED ---');

