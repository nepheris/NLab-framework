import assert from 'node:assert/strict';
import { DiagnosticIdRegistry } from '../core/diagnostic-id-registry.js';
import { DiagnosticCoverageAudit, DiagnosticCoverageAuditError } from '../core/diagnostic-coverage-audit.js';

const registry=new DiagnosticIdRegistry({entries:[
  {
    humanId:'HDR-001',technicalId:'header.main',kind:'component',title:'Header',objective:'Vérifier le header',
    thingsToTest:['Navigation','Actions'],expectedResult:'Header utilisable',files:['components/header-studio.js']
  },
  {
    humanId:'QR-001',technicalId:'qr.studio',kind:'workshop',title:'QR Studio',objective:'',
    thingsToTest:[],expectedResult:'',files:[]
  },
  {
    humanId:'FTR-001',technicalId:'footer.main',kind:'component',title:'Footer',objective:'Vérifier le footer',
    thingsToTest:['Liens'],expectedResult:'Liens utilisables',files:[]
  }
]});
const audit=new DiagnosticCoverageAudit({registry});

const registryReport=audit.auditRegistry();
assert.equal(registryReport.count,3);
assert.equal(registryReport.valid,false);
assert.equal(registryReport.errors,3);
assert.equal(registryReport.warnings,2);
assert.equal(registryReport.items.find(item=>item.humanId==='HDR-001').valid,true);
assert.deepEqual(registryReport.items.find(item=>item.humanId==='QR-001').issues.map(item=>item.code),[
  'MISSING_OBJECTIVE','MISSING_THINGS_TO_TEST','MISSING_EXPECTED_RESULT','NO_FILES'
]);

const zones=[
  {key:'header',ref:'HDR-001',infoTest:true,titleId:true},
  {key:'qr',ref:'qr.studio',infoTest:false,titleId:false},
  {key:'footer',ref:'footer.main',infoTest:true,titleId:true},
  {key:'alias-footer',ref:'FTR-001',infoTest:true,titleId:true},
  {key:'unknown',ref:'missing.ref',infoTest:true,titleId:true},
  {key:'static',testable:false}
];
const zoneReport=audit.auditZones(zones);
assert.equal(zoneReport.valid,false);
assert.ok(zoneReport.items.find(item=>item.key==='qr').issues.some(item=>item.code==='INFO_TEST_MISSING'));
assert.ok(zoneReport.items.find(item=>item.key==='qr').issues.some(item=>item.code==='TITLE_ID_MISSING'));
assert.ok(zoneReport.items.find(item=>item.key==='alias-footer').issues.some(item=>item.code==='SHARED_DIAGNOSTIC_REF'));
assert.ok(zoneReport.items.find(item=>item.key==='unknown').issues.some(item=>item.code==='UNKNOWN_DIAGNOSTIC'));
assert.equal(zoneReport.items.find(item=>item.key==='static').valid,true);

const relaxed=audit.auditZones([{key:'static',testable:false}],{requireInfoTest:false,requireTitleId:false});
assert.equal(relaxed.valid,true);
assert.equal(relaxed.items[0].issues.length,0);

const validAudit=new DiagnosticCoverageAudit({registry:new DiagnosticIdRegistry({entries:[{
  humanId:'CMP-001',technicalId:'component.one',objective:'Tester',thingsToTest:['Action'],expectedResult:'OK',files:['x.js']
}]})});
const all=validAudit.audit({zones:[{key:'one',ref:'CMP-001',infoTest:true,titleId:true}]});
assert.equal(all.valid,true);
assert.equal(all.errors,0);
assert.equal(validAudit.assert(all),all);
assert.throws(()=>audit.assert(audit.audit({zones})),error=>error instanceof DiagnosticCoverageAuditError&&error.code==='COVERAGE_FAILED');
assert.throws(()=>new DiagnosticCoverageAudit({registry:{}}),error=>error.code==='INVALID_REGISTRY');
assert.throws(()=>audit.auditZones({}),error=>error.code==='INVALID_ZONES');
assert.throws(()=>audit.auditZones([null]),error=>error.code==='INVALID_ZONE');

console.log('diagnostic coverage audit tests: ok');
