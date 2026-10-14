// The same engine powers browser generation and regression tests.
const localStorage={getItem(){return null},setItem(){}};
importScripts('app.js','role-priorities.js','fellowship.js','constraints.js','search.js','allocation.js');
function planningTeamsReady(teams){postMessage({type:'teams_ready',teams,recommendedConfiguration,recommendedConfigurationStatus})}
function planningConfigurationReady(recommendedConfiguration,status){postMessage({type:'configuration_ready',recommendedConfiguration,status:status||recommendedConfigurationStatus})}
function planningAlternativesReady(teams){postMessage({type:'alternatives_ready',teams})}
function planningRecommendationsReady(recommendations,parallelStatus){postMessage({type:'recommendations_ready',recommendations,parallelStatus})}
function planningProgress(message){postMessage({type:'progress',message})}
onmessage=({data})=>{try{({players,runs,recommendationRunLimit,template,size,duration,fair,suggestSchedule,fellowshipSetup,constraints}=data);if(suggestSchedule===undefined)suggestSchedule=!!(data.parallel||data.extra);lockPriority=normalizeSelectionMode(data.lockPriority);rolePriorities=normalizeRolePriorities(data.rolePriorities);postMessage({type:'progress',message:'Selecting characters and balancing runs…'});calculateTeams();postMessage({type:'result',teams,recommendations,parallelStatus,message,recommendedConfiguration,recommendedConfigurationStatus})}catch(error){postMessage({type:'error',message:error.message})}};
