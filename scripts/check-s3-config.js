// Check if S3 configuration exists in environment
require('dotenv').config();

const requiredVars = [
  'S3_ENDPOINT',
  'S3_REGION', 
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY'
];

console.log('Checking S3 configuration:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    if (varName.includes('KEY') || varName.includes('SECRET')) {
      console.log(`✓ ${varName}: ${'*'.repeat(value.length)}`);
    } else {
      console.log(`✓ ${varName}: ${value}`);
    }
  } else {
    console.log(`✗ ${varName}: NOT SET`);
  }
});

if (requiredVars.every(varName => process.env[varName])) {
  console.log('\n✓ All S3 configuration variables are set');
} else {
  console.log('\n✗ Some S3 configuration variables are missing');
  console.log('Please set these in your .env file for S3 integration');
}