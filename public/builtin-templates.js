// Bundled templates contain configuration only; no roster or Discord identities.
const builtinPlannerTemplates={
  "constraints": [
    {
      "name": "Heal cut",
      "rule": {
        "version": 1,
        "id": "rule-1791244973629-jtaiy",
        "name": "Heal cut",
        "type": "contribution_target",
        "scope": "each_raid",
        "strength": "hard",
        "enabled": true,
        "config": {
          "target": 100,
          "unit": "%",
          "combination": "additive",
          "groupCombination": "highest",
          "allowDuplicates": false,
          "providers": [
            {
              "name": "Overhand smash",
              "className": "Brawler",
              "spec": "Red",
              "value": 20,
              "stackingGroup": ""
            },
            {
              "name": "Exposed throat",
              "className": "Burglar",
              "spec": "Any",
              "value": 25,
              "stackingGroup": ""
            },
            {
              "name": "Grave wound ",
              "className": "Captain",
              "value": 40,
              "stackingGroup": "",
              "specs": [
                "Blue",
                "Red"
              ]
            },
            {
              "name": "Bards arrow",
              "className": "Hunter",
              "spec": "Yellow",
              "value": 15,
              "stackingGroup": ""
            },
            {
              "name": "The North wind",
              "className": "Mariner",
              "spec": "Yellow",
              "value": 15,
              "stackingGroup": ""
            },
            {
              "name": "Essence of winter",
              "className": "Rune-keeper",
              "spec": "Any",
              "value": 15,
              "stackingGroup": ""
            },
            {
              "name": "No respite ",
              "className": "Warden",
              "spec": "Any",
              "value": 30,
              "stackingGroup": ""
            },
            {
              "name": "Strike a chord ",
              "className": "Minstrel",
              "value": 15,
              "stackingGroup": "",
              "specs": [
                "Red"
              ]
            }
          ]
        }
      }
    }
  ],
  "roles": [
    {
      "name": "Default raid",
      "setup": {
        "version": 2,
        "enabled": true,
        "rules": [
          {
            "role": "Buffer",
            "className": "Any",
            "specs": [],
            "target": "raid",
            "minimum": 1,
            "preferred": 1,
            "strength": "hard",
            "source": "any",
            "effectTarget": "same"
          },
          {
            "role": "Debuffer",
            "className": "Any",
            "specs": [],
            "target": "raid",
            "minimum": 1,
            "preferred": 2,
            "strength": "hard",
            "source": "any",
            "effectTarget": "same",
            "advancedCounts": true
          },
          {
            "role": "Healer",
            "className": "Any",
            "specs": [],
            "target": "each",
            "minimum": 1,
            "preferred": 1,
            "strength": "hard",
            "source": "each",
            "effectTarget": "same"
          },
          {
            "role": "Tank",
            "className": "Any",
            "specs": [],
            "target": "raid",
            "minimum": 1,
            "preferred": 2,
            "strength": "hard",
            "source": "any",
            "effectTarget": "same",
            "advancedCounts": true,
            "placementMode": "together"
          },
          {
            "role": "Any",
            "className": "Beorning",
            "specs": [],
            "target": "raid",
            "minimum": 0,
            "preferred": 1,
            "strength": "soft",
            "source": "any",
            "effectTarget": "same"
          },
          {
            "role": "Any",
            "className": "Minstrel",
            "specs": [],
            "target": "dps",
            "minimum": 0,
            "preferred": 1,
            "strength": "soft",
            "source": "dps",
            "effectTarget": "same"
          },
          {
            "role": "Any",
            "className": "Captain",
            "specs": [
              "Red"
            ],
            "target": "tank",
            "minimum": 0,
            "preferred": 0,
            "strength": "override",
            "source": "tank",
            "effectTarget": "same",
            "placementMode": "none"
          },
          {
            "role": "Any",
            "className": "Beorning",
            "specs": [
              "Yellow"
            ],
            "target": "tank",
            "minimum": 0,
            "preferred": 0,
            "strength": "override",
            "source": "tank",
            "effectTarget": "any",
            "placementMode": "none"
          }
        ],
        "exceptions": [],
        "placements": [],
        "roleDefaults": {
          "Tank": "own",
          "Healer": "own",
          "Debuffer": "own",
          "Buffer": "own",
          "DPS": "own"
        },
        "unified": true,
        "slotAssignments": true,
        "countRequirements": false,
        "capabilitiesSeparated": true
      }
    }
  ]
};
function seedBuiltinPlannerTemplates(){let seeded;try{seeded=JSON.parse(localStorage.getItem('vanguard-builtin-template-seeds')||'[]')}catch{seeded=[]}if(!Array.isArray(seeded))seeded=[];for(let [kind,list] of Object.entries(builtinPlannerTemplates)){for(let t of list){let key=kind+':'+t.name;if(seeded.includes(key))continue;let library=kind==='roles'?roleTemplates:constraintTemplates;if(!library.some(existing=>existing.name===t.name)){let copy=JSON.parse(JSON.stringify(t));if(kind==='roles')validateFellowshipSetup(copy.setup);else validateRules([copy.rule]);library.push(copy)}seeded.push(key)}}persistRoleTemplates();persistConstraintTemplates();localStorage.setItem('vanguard-builtin-template-seeds',JSON.stringify(seeded))}
seedBuiltinPlannerTemplates();
// Start new plans with the bundled raid assignments. Saved sessions replace these on restore.
function applyDefaultRaidOnStartup(){if(players.length||hasGenerated||activeTemplateName||fellowshipSetup.rules.length)return false;let preset=builtinPlannerTemplates.roles.find(t=>t.name==='Default raid');if(!preset)return false;fellowshipSetup=normalizeFellowshipSetup(JSON.parse(JSON.stringify(preset.setup)));activeTemplateName=preset.name;syncUnifiedRoles();dirty=true;render();return true}
applyDefaultRaidOnStartup();
