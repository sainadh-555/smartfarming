import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jjaoftrycuzjefiswnfg.supabase.co', 'sb_publishable_TGAoCsSa4RJ5BdNFjoGMXQ_7jRaNqqJ');

async function fixData() {
  const { data, error } = await supabase.from('zones').upsert([
    { zone_id: 'ZONE-A', name: 'Zone A', crop_type: 'Tomato', area: '2.5 Acres', status: 'Healthy' },
    { zone_id: 'ZONE-B', name: 'Zone B', crop_type: 'Chili', area: '3.0 Acres', status: 'Attention' },
    { zone_id: 'ZONE-C', name: 'Zone C', crop_type: 'Paddy', area: '1.5 Acres', status: 'Healthy' },
    { zone_id: 'ZONE-D', name: 'Zone D', crop_type: 'Groundnut', area: '2.0 Acres', status: 'Critical' }
  ], { onConflict: 'zone_id' });
  
  if(error) console.error(error);
  else console.log("Successfully fixed zones database!");
}
fixData();
