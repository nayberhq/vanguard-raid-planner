// The same engine powers browser generation and regression tests.
const localStorage={getItem(){return null},setItem(){}};
importScripts('app.js','role-priorities.js','fellowship.js','constraints.js','search.js');
function planningTeamsReady(teams){postMessage({type:'teams_ready',teams,recommendedConfiguration})}
function planningConfigurationReady(recommendedConfiguration){postMessage({type:'configuration_ready',recommendedConfiguration})}
function planningAlternativesReady(teams){postMessage({type:'alternatives_ready',teams})}
function planningRecommendationsReady(recommendations,parallelStatus){postMessage({type:'recommendations_ready',recommendations,parallelStatus})}
function planningProgress(message){postMessage({type:'progress',message})}
onmessage=({data})=>{try{({players,runs,template,size,duration,fair,parallel,extra,fellowshipSetup,constraints}=data);rolePriorities=normalizeRolePriorities(data.rolePriorities);postMessage({type:'progress',message:'Selecting characters and balancing runs…'});calculateTeams();postMessage({type:'result',teams,recommendations,parallelStatus,message,recommendedConfiguration})}catch(error){postMessage({type:'error',message:error.message})}};
