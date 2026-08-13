(()=>{const pe="realism-2026-08-13-54",Dt="realism-delta-economy-v1",It="realism-delta-africa-heart-pity-v1",I={entranceX:25.5,entranceZ:-72.2,floorY:-8,straightEndZ:-96.2,turnEndX:8.2,doorX:7.8,chamberEndX:1.8,corridorWidth:3.2,ceilingY:-4.6},ae={damVista:"./assets/scenery/dam-vista.avif",shopInterior:"./assets/scenery/shop-interior.avif",concrete:"./assets/scenery/concrete-realistic.avif",asphalt:"./assets/scenery/asphalt-realistic.avif",brick:"./assets/scenery/brick-realistic.avif",metal:"./assets/scenery/metal-realistic.avif"},Pa={blue:3112407,red:11944514},ue=[{id:"dam",name:"\u4E00\u53F7\u5927\u575D",terrain:"\u6C34\u575D\u5916\u73AF / \u7BA1\u5ECA / \u95F8\u95E8\u5E73\u53F0",scale:1.56},{id:"nuclear",name:"\u6838\u7535\u7AD9",terrain:"\u51B7\u5374\u5854 / \u7EF4\u4FEE\u533A / \u63A7\u5236\u697C",scale:1.6},{id:"space",name:"\u822A\u5929\u57FA\u5730",terrain:"\u53D1\u5C04\u5854 / \u673A\u5E93 / \u71C3\u6599\u7BA1\u7EBF",scale:1.64},{id:"bridge",name:"\u94C1\u7D22\u6865\u7A81\u56F4",terrain:"\u94C1\u7D22\u6865 / \u6CB3\u8C37 / \u6865\u5934\u9635\u5730",scale:1.66}],Et=[{id:"medicine",label:"\u836F\u54C1"},{id:"equipment",label:"\u88C5\u5907"},{id:"weaponry",label:"\u67AA\u68B0\u914D\u4EF6"},{id:"tactical",label:"\u9053\u5177"}],xe=[{id:"weicong",name:"\u5A01\u866B",role:"\u7A81\u51FB",trait:"\u7206\u7834\u7A81\u5165\uFF0C\u9002\u5408\u6B63\u9762\u538B\u5236",portrait:"./assets/operators/weicong.avif"},{id:"luna",name:"\u5362\u5A1C",role:"\u4FA6\u5BDF",trait:"\u6807\u8BB0\u8DEF\u7EBF\uFF0C\u9002\u5408\u63A7\u70B9\u63A8\u8FDB",portrait:"./assets/operators/luna.avif"},{id:"dungou",name:"\u76FE\u6784",role:"\u9632\u62A4",trait:"\u4E3E\u76FE\u6297\u7EBF\uFF0C\u9002\u5408\u8FD1\u8DDD\u79BB\u63A8\u8FDB",portrait:"./assets/operators/dungou.avif"},{id:"medic",name:"\u8702\u533B",role:"\u652F\u63F4",trait:"\u643A\u5E26\u836F\u5242\uFF0C\u5BB9\u9519\u66F4\u9AD8",portrait:"./assets/operators/medic.avif"},{id:"wolf",name:"\u7EA2\u72FC",role:"\u673A\u52A8",trait:"\u9AD8\u901F\u8F6C\u70B9\uFF0C\u9002\u5408\u7ED5\u540E",portrait:"./assets/operators/wolf.avif"},{id:"shepherd",name:"\u7267\u7F8A\u4EBA",role:"\u5DE5\u7A0B",trait:"\u88C5\u5907\u7EF4\u62A4\uFF0C\u9002\u5408\u5B88\u70B9",portrait:"./assets/operators/shepherd.avif"}],Ee=[{id:"white",label:"\u767D\u8272",color:"#e5e7eb",armorProtection:.06,helmetProtection:.03,rigProtection:.02,capacity:4,armorCost:5e3,helmetCost:3500},{id:"green",label:"\u7EFF\u8272",color:"#22c55e",armorProtection:.14,helmetProtection:.07,rigProtection:.04,capacity:6,armorCost:12e3,helmetCost:8500},{id:"blue",label:"\u84DD\u8272",color:"#38bdf8",armorProtection:.24,helmetProtection:.12,rigProtection:.07,capacity:9,armorCost:24e3,helmetCost:17e3},{id:"gold",label:"\u9EC4\u8272",color:"#fbbf24",armorProtection:.36,helmetProtection:.19,rigProtection:.1,capacity:13,armorCost:45e3,helmetCost:32e3},{id:"red",label:"\u7EA2\u8272",color:"#ef4444",armorProtection:.5,helmetProtection:.28,rigProtection:.14,capacity:18,armorCost:72e3,helmetCost:52e3}],Rt=[{id:"chestRig",label:"\u80F8\u6302",baseCost:4200},{id:"helmet",label:"\u5934\u76D4",baseCost:3500},{id:"armor",label:"\u80F8\u7532",baseCost:5e3},{id:"backpack",label:"\u80CC\u5305",baseCost:4800}],zt=Ee.flatMap((e,t)=>Rt.map(a=>{const n=[1,2.35,4.85,8.8,14.2][t],r=a.id==="armor"?e.armorProtection:a.id==="helmet"?e.helmetProtection:a.id==="chestRig"?e.rigProtection:0,o=a.id==="backpack"?e.capacity*2:a.id==="chestRig"?e.capacity:0;return{id:`${a.id==="armor"?"armor":a.id==="helmet"?"helmet":a.id}-${e.id}`,type:a.id,slot:a.id,name:`${e.label}${a.label}`,cost:Math.round(a.baseCost*n),tier:e.id,color:e.color,protection:r,capacity:o,meta:`${a.label}${r?`\u9632\u62A4 ${Math.round(r*100)}%`:""}${o?` \u5BB9\u91CF +${o}`:""}`}})),Pt=[{id:"open-reflex",type:"attachment",name:"\u65E0\u6846\u7EA2\u70B9",cost:9e3,slot:"optic",meta:"\u5F00\u653E\u5F0F\u955C\u67B6\uFF0C\u4E2D\u95F4\u7EA2\u70B9"},{id:"four-x-scope",type:"attachment",name:"\u56DB\u500D\u7784\u51C6\u955C",cost:22e3,slot:"optic",sniperOnly:!0,scopeType:"4x",meta:"4 \u500D\u500D\u7387\uFF0C\u53EA\u80FD\u88C5\u5728\u72D9\u51FB\u67AA"},{id:"vertical-grip",type:"attachment",name:"\u5782\u76F4\u63E1\u628A",cost:6500,slot:"grip",meta:"\u538B\u67AA\u66F4\u7A33"},{id:"tactical-stock",type:"attachment",name:"\u6218\u672F\u67AA\u6258",cost:7800,slot:"stock",meta:"\u5F00\u955C\u66F4\u5FEB"},{id:"muzzle-brake",type:"attachment",name:"\u5236\u9000\u5668",cost:8200,slot:"muzzle",meta:"\u51CF\u5C11\u540E\u5750\u611F"},{id:"extended-mag",type:"attachment",name:"\u6269\u5BB9\u5F39\u5323",cost:11e3,slot:"mag",meta:"\u5F39\u5323\u5BB9\u91CF\u63D0\u5347"},{id:"laser-module",type:"attachment",name:"\u7D2B\u5149\u6FC0\u5149\u5668",cost:7e3,slot:"laser",meta:"\u6301\u7EED\u7D2B\u8272\u6307\u793A\u7EBF"}],$t=[{id:"gun-bizon",type:"weapon",name:"\u91CE\u725B",cost:26e3,weaponClass:"smg",nativeType:"assault",nativeIndex:0,ammoClass:"standard",meta:"\u9AD8\u5BB9\u91CF\u51B2\u950B\u67AA\uFF0C\u8FD1\u8DDD\u79BB\u538B\u5236"},{id:"gun-tenglong",type:"weapon",name:"\u817E\u9F99",cost:38e3,weaponClass:"rifle",nativeType:"rifle",nativeIndex:1,ammoClass:"standard",meta:"\u7A33\u5B9A\u6B65\u67AA\uFF0C\u4E2D\u8DDD\u79BB\u8FDE\u53D1"},{id:"gun-awm",type:"weapon",name:"AWM",cost:68e3,weaponClass:"sniper",nativeType:"marksman",nativeIndex:2,ammoClass:"aw",supports4x:!0,meta:"\u9AD8\u7CBE\u5EA6\u72D9\u51FB\u67AA\uFF0C\u53EF\u88C5\u56DB\u500D\u955C"},{id:"gun-assault",type:"weapon",name:"\u7A81\u51FB\u6B65\u67AA",cost:18e3,weaponClass:"rifle",nativeType:"assault",nativeIndex:0,ammoClass:"standard",meta:"\u539F\u672C\u6B66\u5668\uFF0C75 \u53D1\u5F39\u5323"},{id:"gun-rifle",type:"weapon",name:"\u6B65\u67AA",cost:22e3,weaponClass:"rifle",nativeType:"rifle",nativeIndex:1,ammoClass:"standard",meta:"\u539F\u672C\u6B66\u5668\uFF0C50 \u53D1\u5F39\u5323"},{id:"gun-marksman",type:"weapon",name:"\u5C04\u624B\u6B65\u67AA",cost:3e4,weaponClass:"sniper",nativeType:"marksman",nativeIndex:2,ammoClass:"standard",supports4x:!0,meta:"\u539F\u672C\u6B66\u5668\uFF0C\u534A\u81EA\u52A8\u9AD8\u7CBE\u5EA6"}],Lt=[...Ee.map((e,t)=>({id:`ammo-standard-${e.id}`,type:"ammo",name:`${e.label}\u901A\u7528\u5B50\u5F39`,cost:[1800,3600,7200,13500,22e3][t],tier:e.id,color:e.color,ammoClass:"standard",rounds:60,power:1+t*.06,meta:`\u4E00\u7EC4 60 \u53D1\uFF0C${e.label}\u7B49\u7EA7\u5F39\u836F`})),{id:"ammo-aw-pack",type:"ammo",name:"\u7EA2\u8272 AWM \u4E13\u7528\u5B50\u5F39",cost:7e4,tier:"red",color:"#ef4444",ammoClass:"aw",rounds:14,power:1.42,headshotOneTap:!0,meta:"AWM \u7EA2\u8272\u5F39\uFF0C\u7206\u5934\u4E00\u67AA\u51FB\u5012\uFF0C14 \u53D1\u4E00\u7EC4"}],Nt=[{id:"swift-dose",type:"medicine",name:"\u8FC5\u6377\u836F\u5242",cost:4500,effect:"swift",duration:10,meta:"10 \u79D2\u5185\u901F\u5EA6\u63D0\u5347 20%"},{id:"heal-injector",type:"medicine",name:"\u8840\u91CF\u6062\u590D\u5242",cost:3800,effect:"heal",healPool:60,meta:"\u5355\u652F\u6700\u591A\u6062\u590D 60 \u8840\u91CF"}],Ke=[{id:"frag-grenade",type:"tactical",name:"\u7834\u7247\u624B\u96F7",cost:12800,effect:"grenade",damage:34,radius:6.8,meta:"G \u6295\u63B7\uFF0C\u53EF\u70B8\u88C2\u623F\u5C4B\u5899\u4F53\u5E76\u751F\u6210\u574D\u584C\u7816\u5757"},{id:"flash-bang",type:"tactical",name:"\u95EA\u5149\u5F39",cost:9200,effect:"flash",duration:3,radius:5.2,meta:"H \u6295\u63B7\uFF0C\u547D\u4E2D\u5BF9\u624B\u4F1A\u8BA9\u5BF9\u65B9\u767D\u5C4F 3 \u79D2"}],$a=[...$t,...Pt,...Lt,...zt,...Nt,...Ke],Bt=[{id:"white",label:"\u767D\u8272",color:"#e5e7eb",min:800,max:2600,scan:.5},{id:"green",label:"\u7EFF\u8272",color:"#22c55e",min:3200,max:9e3,scan:.9},{id:"blue",label:"\u84DD\u8272",color:"#38bdf8",min:12e3,max:52e3,scan:1.35},{id:"gold",label:"\u9EC4\u8272",color:"#fbbf24",min:9e4,max:48e4,scan:2.2},{id:"red",label:"\u7EA2\u8272",color:"#ef4444",min:85e4,max:32e5,scan:3.2}],Ht={white:["\u65E7\u5F39\u6302","\u6C11\u7528\u80CC\u5305","\u7834\u635F\u5934\u76D4\u58F3","\u666E\u901A\u80F8\u7532\u7247","\u5851\u6599\u836F\u76D2","\u78E8\u635F\u62A4\u5177\u6263","\u7EBF\u7F06\u5377","\u65E7\u8155\u8868"],green:["\u52A0\u56FA\u80F8\u6302","\u9632\u6C34\u80CC\u5305","\u8F7B\u578B\u5934\u76D4\u5185\u886C","\u590D\u5408\u80F8\u7532\u7247","\u5DE5\u7A0B\u5DE5\u5177\u5305","\u533B\u7597\u5668\u68B0\u76D2","\u6218\u672F\u6C34\u888B","\u52A0\u5BC6\u95E8\u7981\u5361"],blue:["\u6218\u672F\u80CC\u5305","\u9676\u74F7\u63D2\u677F","\u78B3\u7EA4\u7EF4\u5934\u76D4\u58F3","\u6A21\u5757\u5316\u80F8\u6302","\u519B\u89C4\u7535\u53F0","\u52A0\u5BC6\u786C\u76D8","\u9AD8\u7EAF\u5EA6\u82AF\u7247","\u591C\u89C6\u955C\u652F\u67B6"],gold:["\u88C5\u7532\u80CC\u5305\u6846\u67B6","\u91CD\u578B\u80F8\u7532\u6838\u5FC3","\u6307\u6325\u5B98\u80F8\u6302","\u822A\u5929\u6570\u636E\u76D2","\u7A00\u6709\u955C\u5934","\u9AD8\u7EA7\u663E\u5361","\u91D1\u8272\u6000\u8868","\u53CD\u5E94\u5806\u5BC6\u94A5"],red:["\u9ED1\u5323\u5B50\u6A21\u5757","\u7EDD\u5BC6\u670D\u52A1\u5668","\u7EA2\u8272\u94BB\u77F3","\u5B9E\u9A8C\u82AF\u7247","\u5C06\u519B\u80F8\u7532","\u6DF1\u7A7A\u6837\u672C\u76D2","\u975E\u6D32\u4E4B\u661F","\u6838\u5FC3\u63A7\u5236\u5668"]},Re=Bt.flatMap(e=>(Ht[e.id]||[]).map((t,a)=>({id:`loot-${e.id}-${a}`,type:"loot",name:t,tier:e.id,color:e.color,value:["\u975E\u6D32\u4E4B\u661F","\u975E\u6D32\u4E4B\u5FC3"].includes(t)?1e7:Math.round(e.min+(e.max-e.min)*((a+1)/((Ht[e.id]?.length||1)+1))),scanTime:["\u975E\u6D32\u4E4B\u661F","\u975E\u6D32\u4E4B\u5FC3"].includes(t)?5.5:e.scan+a*.08,meta:`${e.label}\u53D8\u5356\u7269`}))),Qi=[12158562,13672826,9264963,14857610],Ji=[{cloth:5068101,vest:2369826,accent:9076058,helmet:3225647},{cloth:3752523,vest:2041131,accent:8095635,helmet:2502970},{cloth:5920585,vest:2829092,accent:10719589,helmet:3618863},{cloth:4477e3,vest:2107940,accent:6321249,helmet:2568491}],ze=[{id:"weicong",build:"assault",cloth:3752246,vest:1514521,accent:12094006,helmet:2830635,skin:12157534,body:1},{id:"luna",build:"scout",cloth:2110020,vest:2239025,accent:4367823,helmet:4871260,skin:13935231,body:.92},{id:"dungou",build:"shield",cloth:1514013,vest:1909287,accent:3900088,helmet:2106666,skin:11038541,body:1.08},{id:"medic",build:"medic",cloth:6252628,vest:2238499,accent:13673766,helmet:4541246,skin:12684135,body:.98},{id:"wolf",build:"mobility",cloth:1645858,vest:2564895,accent:10828852,helmet:2106667,skin:12618340,body:.96},{id:"shepherd",build:"engineer",cloth:3160122,vest:5589559,accent:10123839,helmet:5067083,skin:10382157,body:1.02}],La=setInterval(()=>{const e=window.__FPS_GAME__,t=window.__FPS_THREE__;!e||!t||!e.scene||(clearInterval(La),Na(e,t))},100);function Na(e,t){if(e.__realismUpgradeVersion===pe)return;e.__realismUpgradeVersion=pe,e.__realismMats=Ba(t),Oa(),Gt(e),Zt(),jt(),Vt(),Kt(),Qt(),Fa(),Ha(),br(e),Ua(e),Ya(e),Ia(e,t),Ue(e,t),un(e),Uo(e),bn(e);let a=0;const n=()=>{a+=1,e.arena&&e.__realismPreparedArena!==e.arena&&(Ia(e,t),xo(e.arena),oe(e),sn(e),yo(e,t),Ea(e,t),e.__realismPreparedArena=e.arena),cr(e),Xa(e),Wt(e),ma(e),qe(e),Lr(e),Nr(e),Wa(e),Kr(e),Ci(e,t),$r(e),yr(e,t),Ir(e,t),Ft(e),Er(e,t),Yo(e),fn(e),Gn(e),a%4===0&&e.renderer?.shadowMap&&(e.renderer.shadowMap.needsUpdate=!0),a%2===0&&Zn(e,t),a%6===0&&(qa(),mr(e),On(e),Kn(e),wn(e),Hn(e)),a%30===0&&fo(e),a%12===0&&(rn(e),on(e),dn(e,t),hi(e,t)&&Ea(e,t),go(e,t),Ue(e,t)),requestAnimationFrame(n)};requestAnimationFrame(n)}function Ba(e){const t=ne(e,ae.asphalt,10,10)||T(e,"asphalt","#2f3738","#515a57",10),a=ne(e,ae.concrete,7,7)||T(e,"concrete","#6f746e","#9ba199",7),n=ne(e,ae.concrete,6,6)||T(e,"concrete","#50544d","#777c72",6),r=T(e,"grass","#2d4a2f","#55734a",12),o=T(e,"dirt","#4d4436","#75664f",9),i=ne(e,ae.brick,5,5)||T(e,"brick","#795441","#a17b62",5),s=T(e,"fabric","#445446","#667565",8),l=ne(e,ae.metal,5,5)||T(e,"metal","#34393c","#6b7172",5),d=re(e,"asphalt",10),c=re(e,"concrete",7),u=re(e,"weathered-concrete",6),f=re(e,"grass",12),g=re(e,"dirt",9),M=re(e,"brick",5),D=re(e,"fabric",8),m=($,B=.82,P=.02,H={})=>new e.MeshStandardMaterial({color:$,roughness:B,metalness:P,...H}),E=ne(e,ae.shopInterior,1,1),R=ne(e,ae.damVista,1,1);return{roof:m(2961968,.92,.01,{map:t,bumpMap:d,bumpScale:.038}),asphalt:m(3422776,.95,.01,{map:t,bumpMap:d,bumpScale:.052}),runway:m(2435889,.88,.02,{map:t,bumpMap:d,bumpScale:.045}),concrete:m(7830129,.86,.02,{map:a,bumpMap:c,bumpScale:.047}),stainedConcrete:m(5658703,.9,.01,{map:n,bumpMap:u,bumpScale:.058}),darkConcrete:m(4014138,.88,.02,{map:n,bumpMap:u,bumpScale:.05}),paleConcrete:m(10133658,.84,.01,{map:a,bumpMap:c,bumpScale:.04}),metal:m(4540490,.5,.48,{map:l}),darkMetal:m(1514013,.42,.58,{map:l}),glass:m(6061966,.18,.02,{transparent:!0,opacity:.55}),water:m(2847108,.24,0,{transparent:!0,opacity:.62,emissive:1461859,emissiveIntensity:.15}),sandbag:m(9273442,.94,0,{map:s,bumpMap:D,bumpScale:.027}),rubber:m(1513495,.82,.03),shaftVoid:new e.MeshBasicMaterial({color:0,side:2,fog:!1}),canvas:m(5660752,.91,0,{map:s,bumpMap:D,bumpScale:.024}),packCanvas:m(4939598,.94,0,{map:s,bumpMap:D,bumpScale:.03}),medPanel:m(14218204,.62,0,{emissive:1332013,emissiveIntensity:.08}),dirt:m(6247747,.98,0,{map:o,bumpMap:g,bumpScale:.07}),grass:m(3559218,.96,0,{map:r,bumpMap:f,bumpScale:.085}),leaf:m(3103538,.94,0),leafDark:m(1522468,.96,0),leafLight:m(5536074,.91,0),trunk:m(5916212,.9,0),brick:m(9071189,.88,0,{map:i,bumpMap:M,bumpScale:.075}),curb:m(10132110,.82,0),shopWall:m(10260865,.84,0,{map:a,bumpMap:c,bumpScale:.035}),awningRed:m(9121583,.78,.02),awningBlue:m(3039114,.78,.02),warmLight:m(16766090,.34,0,{emissive:16758364,emissiveIntensity:.35}),sunGlow:m(16766074,.22,0,{emissive:16757575,emissiveIntensity:1.2}),doorPaint:m(2762016,.72,.05),doorRecess:m(9406072,.86,0),interiorWall:m(11971998,.88,0,{map:a,bumpMap:c,bumpScale:.025}),interiorFloor:m(7300697,.9,0,{map:i,bumpMap:M,bumpScale:.03}),interiorCeiling:m(8419436,.9,0),tunnelConcrete:m(7633264,.9,.01,{map:n,bumpMap:u,bumpScale:.045,emissive:3422770,emissiveIntensity:.72}),tunnelFloor:m(6446935,.92,0,{map:i,bumpMap:M,bumpScale:.025,emissive:3157287,emissiveIntensity:.58}),tunnelCeiling:m(5264718,.9,.01,{map:n,emissive:2436133,emissiveIntensity:.62}),tunnelLight:new e.MeshBasicMaterial({color:16769962,fog:!1}),vaultMetal:m(5397083,.46,.5,{map:l,emissive:2107433,emissiveIntensity:.38}),shelfWood:m(5915698,.82,.02),windowFrame:m(1120295,.58,.12),graffitiPaint:m(14176143,.62,0,{emissive:3870507,emissiveIntensity:.08}),spawnBlue:m(3112407,.48,0,{transparent:!0,opacity:.74,emissive:1064824,emissiveIntensity:.2}),spawnRed:m(11944514,.48,0,{transparent:!0,opacity:.74,emissive:7083285,emissiveIntensity:.2}),lootWhite:m(15067115,.58,.02,{emissive:16777215,emissiveIntensity:.05}),lootGreen:m(2278750,.5,.02,{emissive:1332013,emissiveIntensity:.18}),lootBlue:m(3718648,.42,.02,{emissive:481669,emissiveIntensity:.22}),lootGold:m(16498468,.38,.04,{emissive:9584654,emissiveIntensity:.24}),lootRed:m(15680580,.34,.05,{emissive:8330525,emissiveIntensity:.28}),extractGreen:m(2278750,.28,0,{transparent:!0,opacity:.42,emissive:1483594,emissiveIntensity:.75}),extractSmoke:m(4906624,.9,0,{transparent:!0,opacity:.22,emissive:2278750,emissiveIntensity:.35}),purpleLaser:new e.LineBasicMaterial({color:11951359,transparent:!0,opacity:.82}),purpleDot:m(12610815,.25,0,{emissive:9121023,emissiveIntensity:.9}),purpleBeam:m(11951359,.2,0,{transparent:!0,opacity:.42,emissive:9121023,emissiveIntensity:1.4}),opticGlass:m(9294847,.12,0,{transparent:!0,opacity:.42,emissive:2383103,emissiveIntensity:.18}),redDot:m(16722474,.16,0,{emissive:16712965,emissiveIntensity:1.5}),stripe:m(13222562,.72,0),hazardYellow:m(16436245,.58,.02,{emissive:7421714,emissiveIntensity:.12}),pipeRed:m(9383213,.55,.22),pipeBlue:m(2383226,.52,.2),whitePaint:m(15067115,.66,0),fragMetal:m(2699578,.44,.46),blastGlow:m(16747039,.24,0,{transparent:!0,opacity:.72,emissive:16739072,emissiveIntensity:1.45}),flashWhite:m(16777215,.18,0,{transparent:!0,opacity:.8,emissive:16777215,emissiveIntensity:1.8}),dustCloud:m(10783864,.96,0,{transparent:!0,opacity:.34}),grime:m(2106143,.95,0,{transparent:!0,opacity:.38}),shopInteriorPhoto:new e.MeshBasicMaterial({map:E,color:13222841,side:2,fog:!1}),damVistaPhoto:new e.MeshBasicMaterial({map:R,color:16777215,side:2,fog:!1})}}function ne(e,t,a=1,n=1){if(!e?.CanvasTexture||!t)return null;const r=document.createElement("canvas");r.width=4,r.height=4;const o=r.getContext("2d");o.fillStyle="#777b78",o.fillRect(0,0,r.width,r.height);const i=new e.CanvasTexture(r);i.wrapS=e.RepeatWrapping??1e3,i.wrapT=e.RepeatWrapping??1e3,i.repeat?.set?.(a,n),"colorSpace"in i&&(i.colorSpace=e.SRGBColorSpace??"srgb");const s=new Image;return s.decoding="async",s.onload=()=>{r.width=s.naturalWidth||s.width||4,r.height=s.naturalHeight||s.height||4,o.drawImage(s,0,0,r.width,r.height),i.needsUpdate=!0},s.src=t,i}function T(e,t,a,n,r=6){if(!e?.CanvasTexture)return null;const o=document.createElement("canvas");o.width=128,o.height=128;const i=o.getContext("2d");i.fillStyle=a,i.fillRect(0,0,o.width,o.height);const s=be(`${t}:${a}:${n}`);for(let d=0;d<520;d+=1){const c=Math.abs(Math.sin(s+d*91.73)),u=Math.floor(c*9173%o.width),f=Math.floor(c*6113%o.height),g=.04+c%.12;i.fillStyle=c>.52?`rgba(255,255,255,${g})`:`rgba(0,0,0,${g})`,i.fillRect(u,f,1+Math.floor(c*3),1+Math.floor(c*3))}if(t==="brick"){i.strokeStyle="rgba(20, 24, 22, 0.34)",i.lineWidth=2;for(let d=0;d<=128;d+=24){i.beginPath(),i.moveTo(0,d),i.lineTo(128,d),i.stroke();for(let c=d/24%2?0:24;c<=128;c+=48)i.beginPath(),i.moveTo(c,d),i.lineTo(c,d+24),i.stroke()}}else if(t==="asphalt"){i.strokeStyle="rgba(210, 220, 214, 0.09)";for(let d=0;d<18;d+=1)i.beginPath(),i.moveTo(d*23%128,0),i.lineTo(d*23%128+20,128),i.stroke()}else if(t==="fabric"||t==="grass"){i.strokeStyle=n,i.globalAlpha=t==="grass"?.2:.12;for(let d=0;d<42;d+=1){const c=d*37%128;i.beginPath(),i.moveTo(c,0),i.lineTo((c+18)%128,128),i.stroke()}i.globalAlpha=1}else{i.strokeStyle="rgba(0,0,0,0.14)";for(let d=0;d<=128;d+=32)i.beginPath(),i.moveTo(0,d),i.lineTo(128,d+7),i.stroke()}i.fillStyle=n,i.globalAlpha=.07,i.fillRect(0,0,128,128),i.globalAlpha=1;const l=new e.CanvasTexture(o);return l.wrapS=e.RepeatWrapping,l.wrapT=e.RepeatWrapping,l.repeat.set(r,r),e.SRGBColorSpace&&(l.colorSpace=e.SRGBColorSpace),l.needsUpdate=!0,l}function re(e,t,a=6){if(!e?.CanvasTexture)return null;const n=document.createElement("canvas");n.width=128,n.height=128;const r=n.getContext("2d");r.fillStyle="rgb(128,128,128)",r.fillRect(0,0,128,128);const o=be(`relief:${t}`);for(let s=0;s<900;s+=1){const l=Math.abs(Math.sin(o*.001+s*63.729)),d=Math.floor((l*12347+s*17)%128),c=Math.floor((l*7919+s*29)%128),u=Math.round(96+l*72);r.fillStyle=`rgb(${u},${u},${u})`;const f=t==="asphalt"||t==="dirt"?2:1;r.fillRect(d,c,f,f)}if(t==="brick"){r.strokeStyle="rgb(42,42,42)",r.lineWidth=3;for(let s=0;s<=128;s+=24){r.beginPath(),r.moveTo(0,s),r.lineTo(128,s),r.stroke();for(let l=s/24%2?0:24;l<=128;l+=48)r.beginPath(),r.moveTo(l,s),r.lineTo(l,s+24),r.stroke()}}else if(t.includes("concrete")){r.strokeStyle=t==="weathered-concrete"?"rgb(70,70,70)":"rgb(98,98,98)",r.lineWidth=1;for(let s=0;s<14;s+=1){const l=(s*47+Math.abs(o))%128,d=(s*31+Math.abs(o>>2))%128;r.beginPath(),r.moveTo(l,d),r.lineTo((l+8+s*3)%128,(d+19+s*5)%128),r.stroke()}}else if(t==="fabric"||t==="grass"){r.strokeStyle=t==="grass"?"rgb(176,176,176)":"rgb(150,150,150)",r.globalAlpha=.55;for(let s=0;s<64;s+=1){const l=s*37%128;r.beginPath(),r.moveTo(l,0),r.lineTo((l+(t==="grass"?13:5))%128,128),r.stroke()}r.globalAlpha=1}const i=new e.CanvasTexture(n);return i.wrapS=e.RepeatWrapping,i.wrapT=e.RepeatWrapping,i.repeat.set(a,a),e.NoColorSpace!==void 0&&(i.colorSpace=e.NoColorSpace),i.needsUpdate=!0,i}function Ha(){const e="realism-cinematic-grade-style";if(!document.getElementById(e)){const t=document.createElement("style");t.id=e,t.textContent=`
        #realism-cinematic-grade {
          position: fixed;
          inset: 0;
          z-index: 18;
          pointer-events: none;
          opacity: 0.36;
          mix-blend-mode: multiply;
          background:
            radial-gradient(circle at 50% 45%, transparent 0 44%, rgba(2, 6, 14, 0.5) 78%, rgba(2, 6, 14, 0.74) 100%),
            linear-gradient(180deg, rgba(8, 21, 28, 0.06), rgba(2, 6, 14, 0.22)),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 4px);
        }
        body.realism-menu-active #realism-cinematic-grade {
          opacity: 0.28;
        }
        body.realism-flashed #realism-cinematic-grade,
        body.realism-raid-failed #realism-cinematic-grade {
          opacity: 0;
        }
      `,document.head.appendChild(t)}if(!document.getElementById("realism-cinematic-grade")){const t=document.createElement("div");t.id="realism-cinematic-grade",document.body.appendChild(t)}}function Oa(){const e="realism-open-red-dot-ads-style";document.getElementById(e)?.remove();const t=document.createElement("style");t.id=e,t.textContent=`
      .scope-overlay {
        background: transparent !important;
      }
      .scope-overlay.is-open {
        display: block !important;
        background: transparent !important;
      }
      .scope-overlay.is-open::before {
        content: "" !important;
        position: absolute !important;
        left: 50% !important;
        top: 50% !important;
        width: min(18vw, 188px) !important;
        height: min(11vw, 116px) !important;
        transform: translate(-50%, -50%) !important;
        border-left: 9px solid rgba(5, 8, 13, 0.92) !important;
        border-right: 9px solid rgba(5, 8, 13, 0.92) !important;
        border-top: 9px solid rgba(5, 8, 13, 0.92) !important;
        border-bottom: 0 !important;
        border-radius: 2px 2px 0 0 !important;
        background: rgba(141, 211, 255, 0.16) !important;
        box-shadow: inset 0 0 22px rgba(147, 197, 253, 0.16), 0 0 10px rgba(0, 0, 0, 0.45) !important;
      }
      .scope-overlay.is-open::after {
        content: "" !important;
        position: absolute !important;
        left: 50% !important;
        top: 50% !important;
        width: 7px !important;
        height: 7px !important;
        transform: translate(-50%, -50%) !important;
        border-radius: 50% !important;
        background: #ff1f1f !important;
        box-shadow: 0 0 8px rgba(255, 31, 31, 0.95), 0 0 2px rgba(0, 0, 0, 0.7) !important;
      }
      body.realism-ads-open .crosshair {
        opacity: 0 !important;
      }
      body.realism-ads-4x .scope-overlay.is-open {
        background: radial-gradient(circle at center, transparent 0 31%, rgba(0, 0, 0, 0.88) 31.5% 100%) !important;
      }
      body.realism-ads-4x .scope-overlay.is-open::before {
        width: min(52vw, 520px) !important;
        height: min(52vw, 520px) !important;
        border: 2px solid rgba(226, 232, 240, 0.78) !important;
        border-radius: 50% !important;
        background:
          linear-gradient(90deg, transparent calc(50% - 1px), rgba(248, 250, 252, 0.82) calc(50% - 1px), rgba(248, 250, 252, 0.82) calc(50% + 1px), transparent calc(50% + 1px)),
          linear-gradient(0deg, transparent calc(50% - 1px), rgba(248, 250, 252, 0.82) calc(50% - 1px), rgba(248, 250, 252, 0.82) calc(50% + 1px), transparent calc(50% + 1px)),
          radial-gradient(circle, rgba(125, 211, 252, 0.08), transparent 62%) !important;
        box-shadow: inset 0 0 28px rgba(0, 0, 0, 0.42), 0 0 0 999px rgba(0, 0, 0, 0.2) !important;
      }
      body.realism-ads-4x .scope-overlay.is-open::after {
        width: 9px !important;
        height: 9px !important;
        background: #ef4444 !important;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.95) !important;
      }
      body.realism-no-optic .scope-overlay.is-open {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `,document.head.appendChild(t)}function Fa(){const e="realism-flash-overlay-style";document.getElementById(e)?.remove();const t=document.createElement("style");if(t.id=e,t.textContent=`
      #realism-flash-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: white;
        opacity: 0;
        pointer-events: none;
        transition: opacity 90ms linear;
      }
      body.realism-flashed #realism-flash-overlay {
        pointer-events: none;
      }
    `,document.head.appendChild(t),!document.getElementById("realism-flash-overlay")){const a=document.createElement("div");a.id="realism-flash-overlay",document.body.appendChild(a)}}function Ot(e,t=3){const a=Date.now()+Math.max(.2,Number(t)||3)*1e3;e&&(e.__realismFlashUntilMs=Math.max(Number(e.__realismFlashUntilMs||0),a)),Ft(e)}function Ft(e){const t=document.getElementById("realism-flash-overlay");if(!t)return;const a=Math.max(0,Number(e?.__realismFlashUntilMs||0)-Date.now()),n=a<=0?0:a>520?1:a/520;t.style.opacity=String(Math.max(0,Math.min(1,n))),document.body?.classList.toggle("realism-flashed",a>0)}function qa(){const e=document.querySelector(".scope-overlay.is-open"),t=!!pt("optic");document.body?.classList.toggle("realism-no-optic",!t),document.body?.classList.toggle("realism-ads-open",!!e&&t),document.body?.classList.toggle("realism-ads-4x",!!e&&ft())}function Wa(e){!e||pt("optic")||e.aimingDownSight&&(e.aimingDownSight=!1,h(e,"\u88F8\u67AA\u6CA1\u6709\u7784\u51C6\u955C"))}function Xa(e){const t=e.weapon,a=Ce();if(!(!t||t.__realismDamageValue===a)){for(const n of Object.keys(t))typeof t[n]=="number"&&/damage/i.test(n)&&(t[n]=a);typeof t.damage=="number"&&(t.damage=a),t.__realismDamageValue=a}}function Ua(e){if(!e||e.__realismAwHeadshotHooked||typeof e.createBullet!="function")return;e.__realismAwHeadshotHooked=!0;const t=e.createBullet;e.createBullet=function(...n){return Ga(this),t.apply(this,n)}}function Ya(e){if(!e||e.__realismBulletOcclusionInstalled)return;e.__realismBulletOcclusionInstalled=!0;const t=typeof e.getObstacleMeshes=="function"?e.getObstacleMeshes.bind(e):()=>[],a=typeof e.isObstacleMesh=="function"?e.isObstacleMesh.bind(e):()=>!1;e.isObstacleMesh=n=>!!n?.userData?.blocksBullets||a(n),e.getObstacleMeshes=()=>{const n=t().filter(r=>r?.visible!==!1);return e.arena?.group?.traverse?.(r=>{!r?.isMesh||r.visible===!1||!r.userData?.blocksBullets||n.push(r)}),[...new Set(n)]}}function Ga(e){if(!e?.camera||!e.raycaster||e.session?.screen!=="playing"||e.session?.playerAlive===!1||!qt())return;const t=window.__FPS_THREE__;if(!t?.Vector3)return;const a=new t.Vector3,n=new t.Vector3;e.camera.getWorldPosition(a),e.camera.getWorldDirection(n),e.raycaster.set(a,n);const r=typeof e.getShootableTargetMeshes=="function"?e.getShootableTargetMeshes():[],o=typeof e.getObstacleMeshes=="function"?e.getObstacleMeshes():[],i=e.raycaster.intersectObjects([...r,...o],!1);for(const s of i){if(Za(e,s.object))return;const l=ja(e,s.object);if(l){if(l.enemy?.dead||l.enemy?.team===(e.session?.playerTeam||"blue")||!Ka(s,l))return;Qa(e,l,s.point);return}}}function qt(e=x()){const t=te(e),a=le(e),n=a?w(a.defId):null;return t?.id==="gun-awm"&&!!n?.headshotOneTap&&Number(a?.remaining||0)>0}function Za(e,t){if(!t)return!1;if(typeof e?.isObstacleMesh=="function"&&e.isObstacleMesh(t))return!0;const a=String(t.name||"").toLowerCase();return/arena-box|boundary-wall|cover|building|crate|platform|wall|barrel|pallet|sandbag/.test(a)}function ja(e,t){if(!t)return null;for(const a of e.enemyRecords||[]){const n=a.view?.root;if(n&&Va(t,n))return a}return null}function Va(e,t){let a=e;for(;a;){if(a===t)return!0;a=a.parent}return!1}function Ka(e,t){const a=String(e.object?.name||"").toLowerCase();if(/head|helmet|visor/.test(a))return!0;const n=Number(t.enemy?.position?.y||0);return Number(e.point?.y||0)>=n+1.32}function Qa(e,t,a){const n=`${t.enemy?.id||"enemy"}:${t.enemy?.team||"red"}`;t.__realismDamageState={key:n,health:0,nativeHealth:0,hitFlash:Number(t.enemy?.hitFlash||0)},t.__realismRespawnAt=1/0,we(t,e),e.createImpact?.(a),e.hud?.showHitMarker?.(),h(e,"AWM \u7EA2\u8272\u5F39\u7206\u5934\u51FB\u5012")}function Wt(e){!e.session||e.session.screen==="menu"||(Ja(e),nn(e))}function Ja(e){if(!e.session)return;const t=Number(e.now||0);if(e.__realismRaidFailure)return;const a=e.session,n=e.__realismPlayerDamageState||{health:Q(a.health,100),nativeHealth:Q(a.health,100),damageFlash:Number(a.damageFlash||0)};if(e.__realismPlayerDamageState=n,e.__realismPlayerRespawnAt)if(t>=e.__realismPlayerRespawnAt){const s=Pe(e.arena,"blue",0);e.player?.reset?.(s,e.arena?.playerYaw??0),e.__realismPlayerRespawnAt=0,n.health=100,n.nativeHealth=100,n.damageFlash=0}else{ye(e,0,!1);return}const r=Q(a.health,100),o=Number(a.damageFlash||0),i=r<n.nativeHealth-.25||o>n.damageFlash+.08||a.playerAlive===!1;if(e.session.screen==="playing"&&i&&(n.health=F(Math.max(0,n.health-no())),n.health<=0)){Qe(e,t),n.nativeHealth=0,n.damageFlash=o;return}ye(e,n.health,!0),n.nativeHealth=n.health,n.damageFlash=o}function ye(e,t,a){const n=F(Q(t,100));e.session={...e.session,health:n,armor:0,maxArmor:0,playerAlive:a&&n>0}}function Xt(e,t,a="\u53D7\u4F24"){if(!e?.session||e.__realismRaidFailure||e.session.screen!=="playing")return;const n=F(Math.max(0,Number(t)||0));if(!n)return;const r=He(e),o=F(Math.max(0,r-n));if(e.__realismPlayerDamageState={...e.__realismPlayerDamageState||{},health:o,nativeHealth:o,damageFlash:Math.max(.7,Number(e.__realismPlayerDamageState?.damageFlash||0))},o<=0){Qe(e,Number(e.now||0));return}ye(e,o,!0),e.session.damageFlash=1,h(e,`${a} -${Math.round(n)} \u8840`)}function Ta(e,t,a,n="\u547D\u4E2D"){if(!t?.enemy||t.enemy.dead)return;const r=Number.isFinite(t.__realismDamageState?.health)?t.__realismDamageState.health:Q(t.enemy.health,100),o=F(Math.max(0,r-Math.max(0,Number(a)||0)));if(t.__realismDamageState={...t.__realismDamageState||{},key:`${t.enemy.id||"enemy"}:${t.enemy.team||"red"}`,health:o,nativeHealth:o,hitFlash:1},o<=0){t.__realismRespawnAt=1/0,we(t,e),e.hud?.showHitMarker?.(),h(e,`${n}\u51FB\u5012\u76EE\u6807`);return}t.enemy={...t.enemy,health:o,hitFlash:1},t.view?.sync?.(t.enemy,e.player?.getPosition?.()),e.hud?.showHitMarker?.()}function Qe(e,t=Number(e?.now||0)){if(!e||e.__realismRaidFailure)return;const a=en();e.__realismSearch=null,e.__realismExtraction=null,e.__realismPlayerRespawnAt=0,e.__realismLoadoutOpen=!1,e.__realismBackpackSelectedIndex=0,e.__realismPlayerDamageState={health:100,nativeHealth:100,damageFlash:0},e.__realismRaidFailure={startedAt:t,returnAt:t+2.4,lostCount:a},e.session={...e.session||{},screen:"menu",winner:null,playerAlive:!0,health:100,armor:0,maxArmor:0,remainingTime:300,matchDuration:300},h(e,a?`\u64A4\u79BB\u5931\u8D25\uFF0C\u4E22\u5931 ${a} \u4EF6\u8EAB\u4E0A\u7269\u54C1`:"\u64A4\u79BB\u5931\u8D25"),document.body?.classList.add("realism-raid-failed"),document.exitPointerLock?.(),k()}function en(){const e=x(),t=new Set(e.secureContainer||[]),a=tn(e),n=new Set;for(const r of a)n.add(r);for(const r of e.inventory||[]){const o=w(r.defId);o?.type==="loot"&&r.location!=="secure"&&!t.has(r.uid)&&n.add(r.uid),o?.type==="tactical"&&r.location==="carried"&&!t.has(r.uid)&&n.add(r.uid)}return n.size?(e.inventory=(e.inventory||[]).filter(r=>!n.has(r.uid)),an(e,n),e.secureContainer=(e.secureContainer||[]).filter(r=>!n.has(r)&&e.inventory.some(o=>o.uid===r)),e.pendingSale?.uid&&n.has(e.pendingSale.uid)&&(e.pendingSale=null),A(e),k(),n.size):0}function tn(e=x()){return[e.equipped?.weapon,e.equipped?.ammo,e.equipped?.chestRig,e.equipped?.helmet,e.equipped?.armor,e.equipped?.backpack,...e.equipped?.attachments||[]].filter(Boolean)}function an(e,t){e.equipped={...e.equipped||{}};for(const a of["weapon","ammo","chestRig","helmet","armor","backpack"])t.has(e.equipped[a])&&(e.equipped[a]="");e.equipped.attachments=(e.equipped.attachments||[]).filter(a=>!t.has(a))}function nn(e){const t=e.enemyRecords||[];for(let a=0;a<t.length;a+=1){const n=t[a];if(!n?.enemy||n.__realismRespawnAt)continue;const r=n.enemy,o=`${r.id||a}:${r.team||"red"}`;(!n.__realismDamageState||n.__realismDamageState.key!==o)&&(n.__realismDamageState={key:o,health:Q(r.health,100),nativeHealth:Q(r.health,100),hitFlash:Number(r.hitFlash||0)});const i=n.__realismDamageState,s=Q(r.health,100),l=Number(r.hitFlash||0);if((s<i.nativeHealth-.25||l>i.hitFlash+.08||r.dead===!0)&&(i.health=F(Math.max(0,i.health-Ce()))),i.health<=0){n.__realismRespawnAt=1/0,we(n,e),i.nativeHealth=0,i.hitFlash=l;continue}n.enemy={...n.enemy,dead:!1,health:i.health,respawnAt:0},n.view?.sync?.(n.enemy,e.player?.getPosition?.()),i.nativeHealth=i.health,i.hitFlash=l}}function Q(e,t){const a=Number.isFinite(e)?e:t;return Math.max(0,Math.min(t,a))}function F(e){return Math.round(e*10)/10}function rn(e){if(!e.session||!e.arena||e.session.screen==="menu")return;Wt(e),oe(e);const t=Number(e.now||0),a=e.session,n=Number.isFinite(a.startedAt)?a.startedAt:t,r=Math.max(0,t-n),o=Math.max(0,300-r),i=o<=0||a.screen==="matchover";e.session={...e.session,screen:"playing",winner:null,scoreLimit:999999,matchDuration:300,startedAt:i?t:n,remainingTime:i?300:o,armor:0,maxArmor:0};const s=e.enemyRecords||[];for(let l=0;l<s.length;l+=1){const d=s[l];if(!d?.enemy)continue;Yt(e,d,l);const c=d.enemy.dead||(d.enemy.health||0)<=0;if(d.__realismRespawnAt){if(t<d.__realismRespawnAt){we(d,e);continue}pn(e,d,l);continue}c&&(d.__realismRespawnAt=1/0,we(d,e))}}function on(e){const t=(e.arena?.colliders||[]).filter(n=>!n.ladder&&!n.climbable&&Number(n.maxY||0)>=1.05);if(!t.length)return;const a=.38;for(const n of e.enemyRecords||[]){if(n.isLanRemote||n.enemy?.dead||!n.enemy?.position)continue;const r={...n.enemy.position};let o=!1;for(const i of t){if(r.x+a<=i.minX||r.x-a>=i.maxX||r.z+a<=i.minZ||r.z-a>=i.maxZ)continue;const s=[{axis:"x",value:i.minX-a,distance:Math.abs(r.x-(i.minX-a))},{axis:"x",value:i.maxX+a,distance:Math.abs(r.x-(i.maxX+a))},{axis:"z",value:i.minZ-a,distance:Math.abs(r.z-(i.minZ-a))},{axis:"z",value:i.maxZ+a,distance:Math.abs(r.z-(i.maxZ+a))}];s.sort((l,d)=>l.distance-d.distance),r[s[0].axis]=s[0].value,o=!0}o&&(n.enemy={...n.enemy,position:r},n.view?.sync?.(n.enemy,e.player?.getPosition?.()))}}function Pe(e,t="red",a=0){const n=e.teamSpawns?.[t]||e.teamSpawns?.blue||e.teamSpawns?.red,r=n?.length?n:e.enemySpawns?.length?e.enemySpawns:[e.playerSpawn||{x:0,y:0,z:0}],o=r[Math.abs(a)%r.length]||{x:0,y:0,z:0};return q(o)}function oe(e){const t=e.arena;if(!t||t.__realismFixedSpawnsDone)return;if(t.__realismFixedSpawnsDone=!0,X().id==="bridge"){t.teamSpawns={blue:[{x:-6,y:0,z:58},{x:6,y:0,z:58},{x:-14,y:0,z:50},{x:14,y:0,z:50},{x:-24,y:0,z:42},{x:24,y:0,z:42},{x:-34,y:0,z:34},{x:34,y:0,z:34}],red:[{x:-6,y:0,z:-58},{x:6,y:0,z:-58},{x:-14,y:0,z:-50},{x:14,y:0,z:-50},{x:-24,y:0,z:-42},{x:24,y:0,z:-42},{x:-34,y:0,z:-34},{x:34,y:0,z:-34}]},t.enemySpawns=t.teamSpawns.red.map(q),t.playerSpawn=q(t.teamSpawns.blue[0]),t.playerYaw=Math.PI,e.__realismSpawns=t.teamSpawns;return}const a=Math.max(52,Math.min(64,(t.size||t.width||t.depth||120)*.42)),n=Math.max(18,Math.min(28,a*.45)),r=Math.max(36,a-12);t.teamSpawns={blue:[{x:-n,y:0,z:r},{x:-n-6,y:0,z:r-6},{x:-n+6,y:0,z:r-8},{x:-n-12,y:0,z:r-2}],red:[{x:n,y:0,z:-r},{x:n+6,y:0,z:-r+6},{x:n-6,y:0,z:-r+8},{x:n+12,y:0,z:-r+2}]},t.enemySpawns=t.teamSpawns.red.map(q),t.playerSpawn=q(t.teamSpawns.blue[0]),t.playerYaw=0,e.__realismSpawns=t.teamSpawns}function sn(e){if(!(!e?.enemyRecords?.length||!e.arena)){oe(e),ln(e),e.session={...e.session,playerTeam:"blue",scoreLimit:999999,winner:null};for(let t=0;t<e.enemyRecords.length;t+=1){const a=e.enemyRecords[t];if(a?.enemy&&!a.__realismRaidConfigured){const n=Pe(e.arena,"red",t);a.__realismRaidConfigured=!0,a.enemy={...a.enemy,team:"red",name:a.enemy.team==="blue"?`\u5DE1\u903B\u5C0F\u5175 ${t+1}`:a.enemy.name,position:q(n),dead:!1,health:100,respawnAt:0},a.__realismDamageState={key:`${a.enemy.id||t}:red`,health:100,nativeHealth:100,hitFlash:0},a.view?.sync?.(a.enemy,e.player?.getPosition?.())}}}}function ln(e){if(e.session?.screen!=="playing"||!e?.arena?.playerSpawn||e.__realismPlayerSpawnAppliedForArena===e.arena)return;const t=q(e.arena.playerSpawn),a=Number.isFinite(e.arena.playerYaw)?e.arena.playerYaw:Number(e.session?.playerYaw||0);e.session={...e.session,playerSpawn:q(t),playerYaw:a},e.player?.reset?.(t,a),e.__realismPlayerSpawnAppliedForArena=e.arena}function dn(e,t){if(!e?.arena||X().id!=="bridge"||e.selectedMode==="lan"||e.session?.screen!=="playing"||!e.enemyRecords?.length||e.__realismBridgeSoldiersDoneForArena===e.arena)return;oe(e);const a=e.enemyRecords.find(i=>i?.view?.root&&i.enemy);if(!a)return;const n=12,r=8,o=i=>e.enemyRecords.filter(s=>s.enemy?.team===i).length;for(;o("red")<n;)Ut(e,t,a,"red",o("red"));for(;o("blue")<r;)Ut(e,t,a,"blue",o("blue"));e.__realismBridgeSoldiersDoneForArena=e.arena}function Ut(e,t,a,n,r){const o=Pe(e.arena,n,r),i=`bridge-${n}-${r+1}`,s={...a.enemy||{},id:i,name:n==="blue"?`\u6211\u65B9\u7A81\u51FB\u5175 ${r+1}`:`\u6865\u5934\u5B88\u519B ${r+1}`,team:n,position:q(o),dead:!1,health:100,respawnAt:0,hitFlash:0,firingFlash:0,state:n==="blue"?"advance":"guard"},l=cn(e,t,a.view,s),d={...a,enemy:s,view:l,spawnIndex:r,isLanRemote:!1,__realismExtraBridgeSoldier:!0,__realismRaidConfigured:!0,__realismFixedSpawn:q(o),__realismFixedSpawnTeam:n,__realismDamageState:{key:`${i}:${n}`,health:100,nativeHealth:100,hitFlash:0}};e.enemyRecords.push(d),l.sync(s,e.player?.getPosition?.())}function cn(e,t,a,n){const r=a.root.clone(!0);return r.name=`Enemy ${n.id}`,r.userData={...r.userData||{},enemyId:n.id,team:n.team},r.traverse(o=>{o.userData={...o.userData||{},enemyId:n.id,team:n.team},o.isMesh&&(o.material=Array.isArray(o.material)?o.material.map(i=>i.clone?.()||i):o.material?.clone?.()||o.material,o.castShadow=!0,o.receiveShadow=!0)}),e.scene.add(r),{root:r,sync(o,i){const s=o.position||{x:0,y:0,z:0};r.position.set(s.x||0,s.y||0,s.z||0),i&&r.lookAt(i.x||0,r.position.y,i.z||0),r.visible=!o.dead;const l=Number(o.hitFlash||0);r.traverse(d=>{if(!d.isMesh||!d.material)return;const c=Array.isArray(d.material)?d.material:[d.material];for(const u of c)u?.emissive&&(l>0?(u.emissive.setHex?.(16777215),u.emissiveIntensity=.45):u.emissiveIntensity>.25&&(u.emissiveIntensity=.08))})},dispose(){r.parent?.remove(r),r.traverse(o=>{if(!o.isMesh||!o.material)return;const i=Array.isArray(o.material)?o.material:[o.material];for(const s of i)s?.dispose?.()})}}}function Yt(e,t,a){oe(e);const n=t.enemy?.team||"red";if(!t.__realismFixedSpawn||t.__realismFixedSpawnTeam!==n){const r=e.arena?.teamSpawns?.[n]||e.arena?.teamSpawns?.red||e.arena?.teamSpawns?.blue||[],o=Number.isFinite(t.spawnIndex)?t.spawnIndex:a;t.spawnIndex=Math.abs(o)%Math.max(1,r.length),t.__realismFixedSpawn=q(r[t.spawnIndex]||Pe(e.arena,n,a)),t.__realismFixedSpawnTeam=n}return q(t.__realismFixedSpawn)}function we(e,t){e.enemy={...e.enemy,dead:!0,health:0,respawnAt:e.__realismRespawnAt||0,state:"downed"},e.view?.sync?.(e.enemy,t.player?.getPosition?.())}function pn(e,t,a){const n=Yt(e,t,a);t.__realismRespawnAt=0,t.__realismDamageState={key:`${t.enemy?.id||a}:${t.enemy?.team||"red"}`,health:100,nativeHealth:100,hitFlash:0},t.enemy={...t.enemy,dead:!1,health:100,respawnAt:0,hitFlash:0,firingFlash:0,state:"patrol",position:q(n)},t.view?.sync?.(t.enemy,e.player?.getPosition?.())}function q(e){return{x:e?.x||0,y:e?.y||0,z:e?.z||0}}function un(e){e.__realismDoorControlsInstalled||(e.__realismDoorControlsInstalled=!0,e.__realismDoorKeyHandler=t=>{if(t.repeat||!t.key||t.key.toLowerCase()!=="z")return;const a=mn(e);if(!a){e.message="\u9760\u8FD1\u95E8\u518D\u6309 Z";return}a.userData.open=!a.userData.open,a.userData.targetAngle=a.userData.open?a.userData.openAngle:a.userData.closedAngle,e.message=a.userData.open?"\u95E8\u5DF2\u6253\u5F00":"\u95E8\u5DF2\u5173\u95ED",t.preventDefault(),t.stopPropagation()},window.addEventListener("keydown",e.__realismDoorKeyHandler))}function fn(e){e.arena?.group?.__realismDoors&&(e.__realismDoors=e.arena.group.__realismDoors);for(const t of e.__realismDoors||[]){const a=t.userData?.targetAngle||0;t.rotation.y+=(a-t.rotation.y)*.22,hn(t)}}function hn(e){const t=e?.userData?.collider,a=t?.closedBounds;if(!t||!a)return;const n=Number(e.userData?.closedAngle||0),r=Number(e.userData?.openAngle||1);if(Math.min(1,Math.abs((e.rotation.y-n)/Math.max(.001,r-n)))>.34){t.minX=1e5,t.maxX=100001,t.minZ=1e5,t.maxZ=100001;return}Object.assign(t,a)}function mn(e){const t=e.player?.getPosition?.()||e.camera?.position;if(!t)return null;let a=null,n=1/0;for(const r of e.__realismDoors||[]){const o=r.userData?.interactX??r.position.x,i=r.userData?.interactZ??r.position.z,s=Math.hypot((t.x||0)-o,(t.z||0)-i);s<n&&(a=r,n=s)}return n<=8.5?a:null}function bn(e){if(new URLSearchParams(location.search).get("realismQa")!=="1"||document.getElementById("realism-qa-controls"))return;const t=document.createElement("div");t.id="realism-qa-controls",t.setAttribute("aria-label","\u5199\u5B9E\u5347\u7EA7\u6D4B\u8BD5\u5B9A\u4F4D"),t.style.cssText="position:fixed;right:14px;top:84px;z-index:100000;display:flex;flex-wrap:wrap;max-width:560px;gap:6px;padding:7px;background:#0b1018;border:1px solid #fff;color:#fff",t.innerHTML='<button type="button" data-qa-target="shop">\u6D4B\u8BD5\uFF1A\u5E97\u95E8</button><button type="button" data-qa-target="manhole">\u6D4B\u8BD5\uFF1A\u8DF3\u4E95</button><button type="button" data-qa-target="ladder">\u6D4B\u8BD5\uFF1A\u722C\u68AF</button><button type="button" data-qa-target="secret-door">\u6D4B\u8BD5\uFF1A\u5BC6\u9053\u95E8</button><button type="button" data-qa-target="vault">\u6D4B\u8BD5\uFF1A\u5BC6\u85CF</button><button type="button" data-qa-target="wall-shot">\u6D4B\u8BD5\uFF1A\u5899\u6321\u5F39</button><button type="button" data-qa-target="direct-shot">\u6D4B\u8BD5\uFF1A\u76F4\u5C04</button>',t.addEventListener("click",a=>{const n=a.target?.closest?.("button[data-qa-target]")?.dataset?.qaTarget;if(!(!n||e.session?.screen!=="playing")){if(n==="shop"){const r=e.arena?.group?.__realismDoors?.[0],o=Math.sign(Number(r?.userData?.openAngle||1))||1;ie(e,(r?.userData?.interactX||0)+o*2.1,0,r?.userData?.interactZ||0,o>0?Math.PI/2:-Math.PI/2)}if(n==="manhole"){const r=(e.arena?.group?.__realismManholes||[]).find(o=>o.userData?.destination==="shaft");r&&(e.__realismInsideDamBunker=!1,e.__realismDamDescent=null,ie(e,r.userData.interactX,.2,r.userData.interactZ+2.35,0),h(e,"\u6D4B\u8BD5\uFF1A\u5411\u524D\u8D70\u5165\u9ED1\u8272\u4E95\u53E3"),e.input?.keys?.add?.("KeyW"),window.setTimeout(()=>e.input?.keys?.delete?.("KeyW"),900))}if(n==="ladder"&&(e.__realismInsideDamBunker=!0,e.__realismQaForceClimbUntil=performance.now()+3200,ie(e,I.entranceX,I.floorY,I.entranceZ-.45,Math.PI)),n==="secret-door"&&(e.__realismInsideDamBunker=!0,ie(e,I.doorX+1.45,I.floorY,I.straightEndZ,Math.PI/2)),n==="vault"){const r=e.arena?.group?.__realismDamVault;e.__realismInsideDamBunker=!0,ie(e,(r?.position?.x||I.chamberEndX+1.65)+1.7,I.floorY,r?.position?.z||I.straightEndZ,Math.PI/2)}n==="wall-shot"&&gn(e),n==="direct-shot"&&xn(e)}}),document.body.appendChild(t)}function ie(e,t,a,n,r){e?.player?.position&&(e.player.position.set(t,a,n),e.player.velocity?.set?.(0,0,0),e.player.yaw=r,e.player.pitch=0,e.player.grounded=!0,e.player.syncCamera?.())}function gn(e){const t=e.arena?.group?.__realismDoors?.[0],a=(e.enemyRecords||[]).find(s=>s.enemy?.team==="red"&&!s.isLanRemote);if(!t||!a?.enemy)return;const n=Math.sign(Number(t.userData?.openAngle||1))||1,r=Number(t.userData?.interactX||0)-n*4.36,o=Number(t.userData?.interactZ||0)+1.52,i=r-n*4.18;a.__realismDamageState={key:`${a.enemy.id}:${a.enemy.team}`,health:100,nativeHealth:100,hitFlash:0},a.enemy={...a.enemy,dead:!1,health:100,respawnAt:0,position:{x:i+n*2,y:0,z:o}},a.view?.sync?.(a.enemy,e.player?.getPosition?.()),e.__realismQaWallTargetId=a.enemy.id,ie(e,i-n*2,0,o,n>0?-Math.PI/2:Math.PI/2)}function xn(e){const t=e.arena?.group?.__realismDoors?.[0],a=(e.enemyRecords||[]).find(i=>i.enemy?.id===e.__realismQaWallTargetId)||(e.enemyRecords||[]).find(i=>i.enemy?.team==="red"&&!i.isLanRemote);if(!t||!a?.enemy)return;const n=Math.sign(Number(t.userData?.openAngle||1))||1,r=Number(t.userData?.interactX||0)-n*4.36,o=Number(t.userData?.interactZ||0);a.__realismDamageState={key:`${a.enemy.id}:${a.enemy.team}`,health:100,nativeHealth:100,hitFlash:0},a.enemy={...a.enemy,dead:!1,health:100,respawnAt:0,position:{x:r-n*1.7,y:0,z:o}},a.view?.sync?.(a.enemy,e.player?.getPosition?.()),e.__realismQaWallTargetId=a.enemy.id,ie(e,r+n*1.65,0,o,n>0?Math.PI/2:-Math.PI/2)}function Gt(e){if(yn(),document.getElementById("realism-delta-ui"))return;const t=document.createElement("div");t.id="realism-delta-ui",t.dataset.tab="deploy",t.dataset.dirty="1",t.addEventListener("click",a=>Ln(a,e)),t.addEventListener("wheel",Nn,{passive:!1}),document.body.appendChild(t),se(e)}function yn(){const e="realism-delta-interface-style";if(document.getElementById(e))return;const t=document.createElement("style");t.id=e,t.textContent=`
      body.realism-menu-active .overlay.is-open {
        background: transparent !important;
      }
      body.realism-menu-active .overlay.is-open .panel,
      body.realism-menu-active .overlay.is-open .start-button {
        opacity: 0 !important;
        pointer-events: none !important;
      }
      #realism-delta-ui {
        position: fixed;
        inset: 0;
        z-index: 19;
        display: none;
        color: #e5eef7;
        pointer-events: none;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
        text-shadow: none;
      }
      #realism-delta-ui.is-visible {
        display: block;
        pointer-events: auto;
      }
      .delta-shell {
        height: 100%;
        min-height: 100%;
        min-width: 0;
        display: grid;
        grid-template-rows: auto 1fr;
        background:
          linear-gradient(90deg, rgba(3, 7, 18, 0.96), rgba(11, 18, 29, 0.9) 44%, rgba(18, 26, 32, 0.78)),
          radial-gradient(circle at 72% 18%, rgba(71, 85, 105, 0.28), transparent 32%);
      }
      .delta-topbar {
        display: grid;
        grid-template-columns: minmax(240px, 0.9fr) minmax(360px, 1.3fr) auto;
        align-items: stretch;
        gap: 12px;
        min-height: 76px;
        padding: 14px 18px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.22);
        background: rgba(2, 6, 14, 0.72);
      }
      .delta-brand {
        display: grid;
        grid-template-columns: 42px 1fr;
        gap: 10px;
        align-items: center;
      }
      .delta-mark {
        width: 42px;
        height: 42px;
        display: block;
        clip-path: polygon(50% 0, 100% 82%, 67% 82%, 50% 48%, 33% 82%, 0 82%);
        background: linear-gradient(180deg, #dbeafe, #60a5fa 62%, #1e40af);
        box-shadow: 0 0 18px rgba(96, 165, 250, 0.42);
      }
      .delta-brand strong {
        display: block;
        color: #f8fafc;
        font-size: 24px;
        font-weight: 900;
        letter-spacing: 0;
        line-height: 1.05;
      }
      .delta-brand small {
        display: block;
        margin-top: 4px;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 800;
      }
      .delta-tabs {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 8px;
        align-content: center;
      }
      .delta-tabs button,
      .delta-action-row button,
      .delta-invite-row button,
      .delta-market-card button,
      .delta-inventory-item button,
      .delta-operator-card,
      .delta-start-button {
        border: 1px solid rgba(148, 163, 184, 0.36);
        border-radius: 6px;
        background: rgba(15, 23, 42, 0.74);
        color: #dbeafe;
        font: 800 13px/1 system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
        cursor: pointer;
      }
      .delta-tabs button {
        min-height: 42px;
      }
      .delta-tabs button.is-active {
        border-color: rgba(125, 211, 252, 0.85);
        background: linear-gradient(180deg, rgba(30, 64, 175, 0.96), rgba(15, 23, 42, 0.86));
        color: #f8fafc;
      }
      .delta-wallet {
        min-width: 180px;
        display: grid;
        align-content: center;
        justify-items: end;
        padding: 8px 12px;
        border: 1px solid rgba(251, 191, 36, 0.42);
        border-radius: 6px;
        background: rgba(24, 18, 5, 0.56);
      }
      .delta-wallet span {
        color: #fbbf24;
        font-size: 12px;
        font-weight: 900;
      }
      .delta-wallet strong {
        color: #fff7ed;
        font-size: 22px;
        line-height: 1.1;
      }
      .delta-body {
        height: 100%;
        min-height: 0;
        padding: 18px;
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-gutter: stable;
      }
      .delta-page {
        max-width: 1240px;
        margin: 0 auto;
      }
      .delta-warehouse-page {
        padding-bottom: 42px;
      }
      .delta-grid {
        display: grid;
        grid-template-columns: minmax(280px, 0.8fr) minmax(420px, 1.2fr);
        gap: 14px;
        min-height: 0;
      }
      .delta-home {
        min-height: calc(100vh - 112px);
        display: grid;
        grid-template-columns: minmax(330px, 0.9fr) minmax(420px, 1.1fr);
        gap: 14px;
        align-items: stretch;
        position: relative;
        padding-bottom: 88px;
      }
      .delta-map-grid {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }
      .delta-mode-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 12px;
      }
      .delta-map-card {
        min-height: 98px;
        display: grid;
        align-content: center;
        gap: 6px;
        padding: 14px;
        border: 1px solid rgba(148, 163, 184, 0.32);
        border-radius: 8px;
        background:
          linear-gradient(90deg, rgba(15, 23, 42, 0.86), rgba(30, 41, 59, 0.58)),
          repeating-linear-gradient(90deg, rgba(125, 211, 252, 0.06) 0 1px, transparent 1px 34px);
        color: #dbeafe;
        text-align: left;
        cursor: pointer;
      }
      .delta-map-card.is-selected {
        border-color: rgba(251, 191, 36, 0.82);
        background:
          linear-gradient(90deg, rgba(30, 64, 175, 0.88), rgba(15, 23, 42, 0.8)),
          repeating-linear-gradient(90deg, rgba(251, 191, 36, 0.12) 0 1px, transparent 1px 34px);
      }
      .delta-map-card strong {
        color: #f8fafc;
        font-size: 22px;
      }
      .delta-map-card span {
        color: #aebed1;
        font-size: 13px;
        font-weight: 800;
      }
      .delta-mode-card {
        min-height: 82px;
        display: grid;
        align-content: center;
        gap: 6px;
        padding: 12px;
        border: 1px solid rgba(148, 163, 184, 0.32);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.74);
        color: #dbeafe;
        text-align: left;
        cursor: pointer;
      }
      .delta-mode-card.is-selected {
        border-color: rgba(125, 211, 252, 0.85);
        background: linear-gradient(180deg, rgba(30, 64, 175, 0.9), rgba(15, 23, 42, 0.84));
      }
      .delta-mode-card strong {
        color: #f8fafc;
        font-size: 18px;
      }
      .delta-mode-card span {
        color: #aebed1;
        font-size: 12px;
        font-weight: 800;
      }
      .delta-multiplayer-panel {
        margin-top: 12px;
        display: grid;
        gap: 10px;
        padding: 12px;
        border: 1px solid rgba(125, 211, 252, 0.24);
        border-radius: 8px;
        background: rgba(2, 6, 14, 0.46);
      }
      .delta-host-row,
      .delta-guest-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .delta-invite-row {
        display: grid;
        grid-template-columns: minmax(120px, 1fr) auto;
        gap: 8px;
      }
      .delta-invite-input {
        min-width: 0;
        height: 38px;
        padding: 0 12px;
        border: 1px solid rgba(148, 163, 184, 0.42);
        border-radius: 6px;
        background: rgba(15, 23, 42, 0.82);
        color: #f8fafc;
        font: 900 15px/1 system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
        letter-spacing: 2px;
        text-transform: uppercase;
      }
      .delta-invite-chip {
        display: inline-grid;
        align-items: center;
        min-height: 38px;
        padding: 0 12px;
        border: 1px solid rgba(251, 191, 36, 0.58);
        border-radius: 6px;
        background: rgba(24, 18, 5, 0.62);
        color: #fde68a;
        font-size: 20px;
        font-weight: 950;
        letter-spacing: 3px;
      }
      .delta-invite-badge {
        position: fixed;
        left: 22px;
        top: 92px;
        z-index: 30;
        display: grid;
        gap: 4px;
        padding: 10px 12px;
        border: 1px solid rgba(251, 191, 36, 0.62);
        border-radius: 8px;
        background: rgba(24, 18, 5, 0.82);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
      }
      .delta-invite-badge span {
        color: #fbbf24;
        font-size: 11px;
        font-weight: 900;
      }
      .delta-invite-badge strong {
        color: #fff7ed;
        font-size: 24px;
        line-height: 1;
        letter-spacing: 4px;
      }
      .delta-start-dock {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 28;
        display: grid;
        justify-items: end;
        gap: 8px;
        pointer-events: auto;
      }
      .delta-start-dock span {
        color: #94a3b8;
        font-size: 12px;
        font-weight: 900;
      }
      .delta-panel {
        min-width: 0;
        min-height: 0;
        padding: 16px;
        border: 1px solid rgba(148, 163, 184, 0.26);
        border-radius: 8px;
        background: rgba(8, 13, 22, 0.82);
        box-shadow: inset 0 1px rgba(255, 255, 255, 0.04);
      }
      .delta-panel h2,
      .delta-panel h3 {
        margin: 0 0 10px;
        color: #f8fafc;
        font-size: 20px;
        line-height: 1.15;
        letter-spacing: 0;
      }
      .delta-panel p {
        margin: 0;
        color: #aebed1;
        font-size: 13px;
        line-height: 1.45;
      }
      .delta-hero-operator {
        min-height: 420px;
        display: grid;
        grid-template-rows: 1fr auto;
        overflow: hidden;
      }
      .delta-operator-portrait {
        position: relative;
        min-height: 300px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 7px;
        background:
          linear-gradient(145deg, rgba(51, 65, 85, 0.72), rgba(2, 6, 14, 0.92)),
          repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.08) 0 1px, transparent 1px 42px);
      }
      .delta-operator-portrait::before {
        content: "";
        position: absolute;
        left: 50%;
        bottom: 18px;
        width: 138px;
        height: 235px;
        transform: translateX(-50%);
        border-radius: 52px 52px 18px 18px;
        background:
          linear-gradient(180deg, #263238 0 19%, transparent 19%),
          linear-gradient(90deg, transparent 0 16%, #101923 16% 31%, transparent 31% 69%, #101923 69% 84%, transparent 84%),
          linear-gradient(180deg, #475569 20%, #1f2937 58%, #111827 100%);
        box-shadow: 0 24px 34px rgba(0, 0, 0, 0.38);
      }
      .delta-operator-portrait::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 56px;
        width: 82px;
        height: 48px;
        transform: translateX(-50%);
        border-radius: 28px 28px 12px 12px;
        background: #0f172a;
        border-bottom: 10px solid rgba(125, 211, 252, 0.34);
      }
      .delta-operator-meta {
        display: grid;
        gap: 6px;
        margin-top: 12px;
      }
      .delta-operator-meta strong {
        color: #f8fafc;
        font-size: 30px;
        line-height: 1.05;
      }
      .delta-tag-row,
      .delta-action-row,
      .delta-equipped-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      .delta-tag {
        display: inline-flex;
        min-height: 26px;
        align-items: center;
        padding: 0 9px;
        border: 1px solid rgba(148, 163, 184, 0.32);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.82);
        color: #cbd5e1;
        font-size: 12px;
        font-weight: 900;
      }
      .delta-start-button {
        min-width: 154px;
        min-height: 46px;
        border-color: rgba(96, 165, 250, 0.78);
        background: linear-gradient(180deg, #2563eb, #1e3a8a);
        color: #f8fafc;
        font-size: 15px;
      }
      .delta-action-row button {
        min-height: 42px;
        padding: 0 14px;
      }
      .delta-stat-grid,
      .delta-market-grid,
      .delta-inventory-grid,
      .delta-operator-grid {
        display: grid;
        gap: 10px;
      }
      .delta-stat-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin: 12px 0;
      }
      .delta-stat {
        min-height: 74px;
        display: grid;
        align-content: center;
        padding: 10px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 6px;
        background: rgba(15, 23, 42, 0.56);
      }
      .delta-stat span {
        color: #94a3b8;
        font-size: 12px;
        font-weight: 900;
      }
      .delta-stat strong {
        color: #f8fafc;
        font-size: 22px;
      }
      .delta-equipped-slot,
      .delta-inventory-item,
      .delta-market-card,
      .delta-operator-card {
        min-width: 0;
        padding: 12px;
        text-align: left;
        border-radius: 7px;
        background: rgba(11, 18, 29, 0.78);
      }
      .delta-equipped-slot {
        flex: 1 1 160px;
        min-height: 88px;
        border: 1px solid rgba(148, 163, 184, 0.24);
      }
      .delta-equipped-slot span,
      .delta-market-card span,
      .delta-inventory-item span,
      .delta-operator-card span {
        display: block;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 900;
      }
      .delta-equipped-slot strong,
      .delta-market-card strong,
      .delta-inventory-item strong,
      .delta-operator-card strong {
        display: block;
        margin-top: 6px;
        color: #f8fafc;
        font-size: 17px;
        line-height: 1.2;
      }
      .delta-market-grid,
      .delta-inventory-grid,
      .delta-operator-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .delta-market-layout {
        display: grid;
        grid-template-columns: 176px minmax(0, 1fr);
        gap: 14px;
        margin-top: 14px;
      }
      .delta-market-rail {
        display: grid;
        align-content: start;
        gap: 8px;
        padding: 10px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 8px;
        background: rgba(2, 6, 14, 0.42);
      }
      .delta-market-rail button {
        min-height: 46px;
        border: 1px solid rgba(148, 163, 184, 0.32);
        border-radius: 6px;
        background: rgba(15, 23, 42, 0.76);
        color: #cbd5e1;
        font-weight: 900;
        cursor: pointer;
      }
      .delta-market-rail button.is-active {
        border-color: rgba(125, 211, 252, 0.84);
        background: rgba(30, 64, 175, 0.72);
        color: #f8fafc;
      }
      .delta-equipment-band {
        display: grid;
        gap: 8px;
        margin-top: 14px;
      }
      .delta-equipment-row {
        display: grid;
        grid-template-columns: 74px repeat(5, minmax(0, 1fr));
        gap: 8px;
        align-items: stretch;
      }
      .delta-equipment-label {
        display: grid;
        align-content: center;
        padding: 10px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 6px;
        background: rgba(15, 23, 42, 0.58);
        color: #bfdbfe;
        font-size: 13px;
        font-weight: 900;
      }
      .delta-inventory-scroll {
        max-height: min(560px, calc(100vh - 230px));
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
        scrollbar-gutter: stable;
        padding-right: 6px;
        scrollbar-color: rgba(125, 211, 252, 0.65) rgba(15, 23, 42, 0.5);
      }
      .delta-market-scroll,
      .delta-warehouse-scroll {
        max-height: min(650px, calc(100vh - 190px));
      }
      .delta-exchange-scroll {
        max-height: min(650px, calc(100vh - 190px));
      }
      .delta-inventory-scroll::-webkit-scrollbar {
        width: 8px;
      }
      .delta-inventory-scroll::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: rgba(125, 211, 252, 0.62);
      }
      .delta-inventory-scroll::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.46);
      }
      .delta-market-section {
        display: grid;
        gap: 10px;
        margin-top: 14px;
      }
      .delta-market-section h3 {
        margin: 0;
        color: #bfdbfe;
        font-size: 15px;
      }
      .delta-market-card {
        border: 1px solid rgba(148, 163, 184, 0.24);
      }
      .delta-market-card button,
      .delta-inventory-item button {
        width: 100%;
        min-height: 36px;
        margin-top: 10px;
      }
      .delta-item-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-top: 10px;
      }
      .delta-item-actions button {
        margin-top: 0;
      }
      .delta-market-card button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .delta-inventory-item.is-equipped,
      .delta-operator-card.is-selected {
        border-color: rgba(125, 211, 252, 0.86);
        background: rgba(30, 64, 175, 0.42);
      }
      .delta-operator-card {
        display: grid;
        grid-template-columns: 58px 1fr;
        gap: 10px;
        align-items: center;
      }
      .delta-operator-outline {
        width: 48px;
        height: 70px;
        position: relative;
        border: 2px solid rgba(125, 211, 252, 0.58);
        border-radius: 24px 24px 12px 12px;
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.28), rgba(15, 23, 42, 0.78));
        box-shadow: inset 0 0 0 1px rgba(248, 250, 252, 0.08);
      }
      .delta-operator-outline::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 7px;
        width: 28px;
        height: 20px;
        transform: translateX(-50%);
        border: 2px solid rgba(248, 250, 252, 0.62);
        border-radius: 16px 16px 8px 8px;
      }
      .delta-operator-outline::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 32px;
        width: 36px;
        height: 28px;
        transform: translateX(-50%);
        border: 2px solid rgba(248, 250, 252, 0.52);
        border-radius: 8px 8px 5px 5px;
      }
      .delta-operator-copy {
        min-width: 0;
      }
      .delta-empty {
        min-height: 170px;
        display: grid;
        place-items: center;
        padding: 20px;
        border: 1px dashed rgba(148, 163, 184, 0.34);
        border-radius: 8px;
        background: rgba(2, 6, 14, 0.42);
        color: #94a3b8;
        font-weight: 900;
        text-align: center;
      }
      .delta-weapon-preview {
        min-height: 190px;
        position: relative;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 7px;
        background:
          linear-gradient(180deg, rgba(15, 23, 42, 0.84), rgba(2, 6, 14, 0.92)),
          repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.06) 0 1px, transparent 1px 32px);
        overflow: hidden;
      }
      .delta-rifle {
        position: absolute;
        left: 50%;
        top: 50%;
        width: min(560px, 84%);
        height: 78px;
        transform: translate(-50%, -50%);
      }
      .delta-rifle::before {
        content: "";
        position: absolute;
        left: 18%;
        top: 28px;
        width: 56%;
        height: 16px;
        border-radius: 5px;
        background: linear-gradient(90deg, #111827, #334155 45%, #0f172a);
      }
      .delta-rifle::after {
        content: "";
        position: absolute;
        left: 67%;
        top: 32px;
        width: 26%;
        height: 8px;
        border-radius: 3px;
        background: #0a0f18;
        box-shadow: 42px 0 0 #111827;
      }
      .delta-rifle span {
        position: absolute;
        left: 37%;
        top: 5px;
        width: 78px;
        height: 46px;
        border-left: 8px solid #111827;
        border-right: 8px solid #111827;
        border-top: 8px solid #111827;
        border-radius: 4px 4px 0 0;
        background: rgba(125, 211, 252, 0.16);
      }
      .delta-rifle span::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        width: 7px;
        height: 7px;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background: #ff2a2a;
        box-shadow: 0 0 10px rgba(255, 42, 42, 0.92);
      }
      .delta-rifle.has-4x span {
        left: 34%;
        width: 118px;
        height: 34px;
        border: 7px solid #111827;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.16);
      }
      .delta-rifle.has-4x span::after {
        width: 38px;
        height: 2px;
        border-radius: 2px;
        background: #ef4444;
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.9);
      }
      .delta-rifle i {
        position: absolute;
        left: 49%;
        top: 45px;
        width: 28px;
        height: 55px;
        display: block;
        border-radius: 3px;
        background: #111827;
        transform: rotate(-8deg);
      }
      .delta-note {
        margin-top: 10px;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 800;
      }
      #realism-player-status {
        position: fixed;
        left: 16px;
        bottom: 16px;
        z-index: 22;
        width: min(330px, calc(100vw - 32px));
        display: none;
        padding: 12px;
        border: 1px solid rgba(148, 163, 184, 0.32);
        border-radius: 8px;
        background: rgba(3, 7, 18, 0.78);
        color: #e5eef7;
        pointer-events: none;
        text-shadow: none;
      }
      #realism-player-status.is-visible {
        display: block;
      }
      .realism-status-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
      }
      .realism-status-head strong {
        color: #f8fafc;
        font-size: 16px;
      }
      .realism-status-head span {
        color: #93c5fd;
        font-size: 12px;
        font-weight: 900;
      }
      .realism-health-track {
        height: 12px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(148, 163, 184, 0.3);
      }
      .realism-health-fill {
        height: 100%;
        width: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #ef4444, #f97316 42%, #22c55e);
      }
      .realism-status-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
        margin-top: 8px;
      }
      .realism-status-grid span {
        min-height: 28px;
        display: grid;
        align-content: center;
        padding: 5px 7px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 5px;
        background: rgba(15, 23, 42, 0.58);
        color: #cbd5e1;
        font-size: 12px;
        font-weight: 800;
      }
      #realism-search-panel {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 23;
        width: min(760px, calc(100vw - 32px));
        max-height: calc(100vh - 64px);
        display: none;
        transform: translate(-50%, -50%);
        overflow-y: auto;
        padding: 14px;
        border: 1px solid rgba(125, 211, 252, 0.42);
        border-radius: 8px;
        background: rgba(3, 7, 18, 0.92);
        box-shadow: 0 18px 54px rgba(0, 0, 0, 0.48);
        color: #e5eef7;
        text-align: left;
        text-shadow: none;
      }
      #realism-search-panel.is-visible {
        display: block;
      }
      #realism-extract-panel {
        position: fixed;
        left: 50%;
        top: 92px;
        z-index: 24;
        width: min(360px, calc(100vw - 32px));
        display: none;
        transform: translateX(-50%);
        padding: 12px;
        border: 1px solid rgba(74, 222, 128, 0.58);
        border-radius: 8px;
        background: rgba(2, 20, 12, 0.86);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.38);
        color: #dcfce7;
        text-align: center;
        text-shadow: none;
      }
      #realism-extract-panel.is-visible {
        display: block;
      }
      #realism-extract-panel strong {
        display: block;
        color: #f0fdf4;
        font-size: 18px;
      }
      #realism-extract-panel span {
        display: block;
        margin-top: 5px;
        color: #bbf7d0;
        font-size: 12px;
        font-weight: 900;
      }
      .realism-extract-track {
        height: 9px;
        margin-top: 10px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(15, 23, 42, 0.82);
      }
      .realism-extract-fill {
        height: 100%;
        width: 0%;
        border-radius: inherit;
        background: linear-gradient(90deg, #22c55e, #bbf7d0);
      }
      #realism-extract-cinematic {
        position: fixed;
        inset: 0;
        z-index: 40;
        display: none;
        place-items: center;
        background:
          radial-gradient(circle at 50% 52%, rgba(34, 197, 94, 0.28), rgba(2, 6, 14, 0.92) 58%),
          linear-gradient(180deg, rgba(3, 7, 18, 0.88), rgba(6, 78, 59, 0.82));
        color: #f0fdf4;
        text-shadow: none;
      }
      body.realism-extracting #realism-extract-cinematic {
        display: grid;
      }
      #realism-raid-fail-cinematic {
        position: fixed;
        inset: 0;
        z-index: 41;
        display: none;
        place-items: center;
        background:
          radial-gradient(circle at 50% 52%, rgba(239, 68, 68, 0.28), rgba(2, 6, 14, 0.94) 58%),
          linear-gradient(180deg, rgba(24, 7, 7, 0.9), rgba(69, 10, 10, 0.84));
        color: #fee2e2;
        text-shadow: none;
      }
      body.realism-raid-failed #realism-raid-fail-cinematic {
        display: grid;
      }
      .realism-extract-card {
        display: grid;
        justify-items: center;
        gap: 12px;
        transform: translateY(8px);
        animation: realism-extract-rise 2.4s ease both;
      }
      .realism-extract-card strong {
        font-size: 42px;
        line-height: 1;
        letter-spacing: 0;
      }
      .realism-extract-card span {
        color: #bbf7d0;
        font-size: 14px;
        font-weight: 900;
      }
      #realism-raid-fail-cinematic .realism-extract-card span {
        color: #fecaca;
      }
      body .scorebar,
      body .scoreboard,
      body .match-over,
      body .matchover,
      body.realism-raid-playing .scorebar,
      body.realism-raid-playing .scoreboard,
      body.realism-raid-playing .match-over,
      body.realism-raid-playing .matchover,
      body.realism-extracting .scorebar,
      body.realism-extracting .scoreboard,
      body.realism-extracting .match-over,
      body.realism-extracting .matchover {
        display: none !important;
      }
      #realism-loadout-panel {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 24;
        width: min(880px, calc(100vw - 32px));
        max-height: calc(100vh - 64px);
        display: none;
        transform: translate(-50%, -50%);
        overflow-y: auto;
        padding: 14px;
        border: 1px solid rgba(148, 163, 184, 0.44);
        border-radius: 8px;
        background: rgba(3, 7, 18, 0.94);
        box-shadow: 0 18px 54px rgba(0, 0, 0, 0.52);
        color: #e5eef7;
        text-align: left;
        text-shadow: none;
      }
      #realism-loadout-panel.is-visible {
        display: block;
      }
      .realism-loadout-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .realism-loadout-head strong {
        color: #f8fafc;
        font-size: 19px;
      }
      .realism-loadout-head span {
        color: #93c5fd;
        font-size: 12px;
        font-weight: 900;
      }
      .realism-loadout-layout {
        display: grid;
        grid-template-columns: minmax(260px, 0.85fr) minmax(360px, 1.15fr);
        gap: 12px;
      }
      .realism-loadout-section {
        min-width: 0;
        padding: 12px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 7px;
        background: rgba(15, 23, 42, 0.58);
      }
      .realism-loadout-section h3 {
        margin: 0 0 10px;
        color: #bfdbfe;
        font-size: 15px;
      }
      .realism-loadout-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .realism-loadout-item {
        position: relative;
        overflow: hidden;
        min-height: 96px;
        display: grid;
        align-content: space-between;
        gap: 6px;
        padding: 10px;
        border: 1px solid rgba(148, 163, 184, 0.34);
        border-radius: 7px;
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.84), rgba(8, 13, 22, 0.76));
      }
      .realism-loadout-item > * {
        position: relative;
        z-index: 1;
      }
      .realism-loadout-item.is-selected {
        border-color: rgba(255, 255, 255, 0.98) !important;
        box-shadow:
          0 0 0 2px rgba(255, 255, 255, 0.82),
          0 0 24px rgba(255, 255, 255, 0.62),
          inset 0 0 22px rgba(255, 255, 255, 0.12);
      }
      .realism-loadout-item.is-selected::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        width: min(78%, 100px);
        aspect-ratio: 1;
        border: 3px solid rgba(255, 255, 255, 0.96);
        border-radius: 999px;
        transform: translate(-50%, -50%);
        box-shadow:
          0 0 10px rgba(255, 255, 255, 0.92),
          0 0 24px rgba(255, 255, 255, 0.58),
          inset 0 0 14px rgba(255, 255, 255, 0.24);
        pointer-events: none;
      }
      .realism-loadout-item span {
        color: #aebed1;
        font-size: 11px;
        font-weight: 900;
      }
      .realism-loadout-item strong {
        color: #f8fafc;
        font-size: 15px;
        line-height: 1.12;
      }
      .realism-loadout-item.is-empty {
        border-style: dashed;
        color: #64748b;
        background: rgba(15, 23, 42, 0.34);
      }
      .realism-search-head {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 10px;
        align-items: center;
      }
      .realism-search-head strong {
        display: block;
        color: #f8fafc;
        font-size: 18px;
        line-height: 1.15;
      }
      .realism-search-head span {
        color: #9fb2c8;
        font-size: 12px;
        font-weight: 850;
      }
      .realism-search-layout {
        display: grid;
        grid-template-columns: 190px minmax(0, 1fr);
        gap: 12px;
        margin-top: 12px;
      }
      .realism-search-side {
        display: grid;
        align-content: start;
        gap: 8px;
        padding: 10px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 7px;
        background: rgba(15, 23, 42, 0.56);
      }
      .realism-search-side span {
        color: #cbd5e1;
        font-size: 12px;
        font-weight: 850;
      }
      .realism-search-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .realism-loot-slot {
        position: relative;
        overflow: hidden;
        min-height: 106px;
        display: grid;
        align-content: space-between;
        gap: 6px;
        padding: 10px;
        border: 1px solid rgba(148, 163, 184, 0.34);
        border-radius: 7px;
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.84), rgba(8, 13, 22, 0.76));
      }
      .realism-loot-slot > * {
        position: relative;
        z-index: 1;
      }
      .realism-loot-slot.is-selected {
        border-color: rgba(255, 255, 255, 0.98) !important;
        box-shadow:
          0 0 0 2px rgba(255, 255, 255, 0.82),
          0 0 24px rgba(255, 255, 255, 0.62),
          inset 0 0 22px rgba(255, 255, 255, 0.12);
      }
      .realism-loot-slot.is-selected::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        width: min(78%, 104px);
        aspect-ratio: 1;
        border: 3px solid rgba(255, 255, 255, 0.96);
        border-radius: 999px;
        transform: translate(-50%, -50%);
        box-shadow:
          0 0 10px rgba(255, 255, 255, 0.92),
          0 0 24px rgba(255, 255, 255, 0.58),
          inset 0 0 14px rgba(255, 255, 255, 0.24);
        pointer-events: none;
      }
      .realism-loot-slot.is-empty,
      .realism-loot-slot.is-scanning {
        border-style: dashed;
        color: #64748b;
        background: rgba(15, 23, 42, 0.34);
      }
      .realism-loot-slot.is-taken {
        opacity: 0.58;
      }
      .realism-loot-slot span {
        color: #aebed1;
        font-size: 11px;
        font-weight: 900;
      }
      .realism-loot-slot strong {
        color: #f8fafc;
        font-size: 15px;
        line-height: 1.12;
      }
      .realism-loot-slot button,
      .realism-search-actions button {
        min-height: 32px;
        border: 1px solid rgba(125, 211, 252, 0.42);
        border-radius: 6px;
        background: rgba(30, 64, 175, 0.72);
        color: #f8fafc;
        font-weight: 900;
        cursor: pointer;
      }
      .realism-loot-slot button:disabled,
      .realism-search-actions button:disabled {
        cursor: default;
        opacity: 0.5;
      }
      .realism-search-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 12px;
      }
      .realism-search-glass,
      .delta-sale-glass {
        display: inline-grid;
        place-items: center;
        width: 28px;
        height: 28px;
        margin-right: 8px;
        border: 2px solid currentColor;
        border-radius: 50%;
        color: #93c5fd;
        vertical-align: middle;
        animation: realism-spin 0.7s linear infinite;
      }
      .realism-search-glass::after,
      .delta-sale-glass::after {
        content: "";
        width: 11px;
        height: 2px;
        background: currentColor;
        transform: translate(14px, 12px) rotate(45deg);
        transform-origin: left center;
      }
      .realism-search-track {
        height: 8px;
        margin-top: 10px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(15, 23, 42, 0.92);
      }
      .realism-search-fill {
        height: 100%;
        width: 0%;
        border-radius: inherit;
        background: linear-gradient(90deg, #38bdf8, #fbbf24);
      }
      .delta-sale-pending {
        opacity: 0.88;
      }
      .delta-sale-pending button {
        pointer-events: none;
      }
      .delta-shell {
        background:
          linear-gradient(90deg, rgba(3, 7, 13, 0.98), rgba(10, 18, 26, 0.94) 39%, rgba(21, 30, 34, 0.86)),
          radial-gradient(circle at 78% 18%, rgba(53, 69, 74, 0.38), transparent 34%),
          repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.035) 0 1px, transparent 1px 44px);
      }
      .delta-shell::before {
        content: "";
        position: fixed;
        inset: 76px 0 0;
        pointer-events: none;
        opacity: 0.42;
        background:
          linear-gradient(115deg, transparent 0 52%, rgba(148, 163, 184, 0.08) 52% 53%, transparent 53%),
          radial-gradient(circle at 78% 48%, rgba(30, 41, 45, 0.84), transparent 34%);
      }
      .delta-topbar {
        min-height: 72px;
        border-bottom-color: rgba(114, 130, 132, 0.36);
        background: rgba(3, 8, 13, 0.88);
        box-shadow: 0 14px 38px rgba(0, 0, 0, 0.28);
      }
      .delta-page {
        max-width: 1440px;
      }
      .delta-panel {
        border-color: rgba(105, 124, 128, 0.32);
        background:
          linear-gradient(180deg, rgba(12, 22, 30, 0.86), rgba(4, 9, 15, 0.88)),
          repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 38px);
        backdrop-filter: blur(8px);
      }
      .delta-tabs button,
      .delta-action-row button,
      .delta-market-card button,
      .delta-inventory-item button,
      .delta-start-button {
        box-shadow: inset 0 1px rgba(255,255,255,0.07), 0 8px 18px rgba(0,0,0,0.18);
      }
      .delta-home {
        grid-template-columns: minmax(320px, 0.8fr) minmax(480px, 1.2fr);
        gap: 16px;
      }
      .delta-raid-brief {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 4px 12px;
        align-items: end;
        margin-bottom: 14px;
        padding: 12px;
        border: 1px solid rgba(125, 211, 252, 0.24);
        border-radius: 7px;
        background:
          linear-gradient(90deg, rgba(7, 19, 28, 0.78), rgba(21, 34, 35, 0.58)),
          repeating-linear-gradient(90deg, rgba(125, 211, 252, 0.06) 0 1px, transparent 1px 36px);
      }
      .delta-raid-brief span {
        color: #7dd3fc;
        font-size: 12px;
        font-weight: 950;
      }
      .delta-raid-brief strong {
        color: #f8fafc;
        font-size: 24px;
        line-height: 1;
      }
      .delta-raid-brief em {
        grid-column: 1 / -1;
        color: #a7b6bf;
        font-style: normal;
        font-size: 12px;
        font-weight: 850;
      }
      .delta-raid-preview {
        min-height: 210px;
        position: relative;
        overflow: hidden;
        margin: 12px 0 14px;
        border: 1px solid rgba(114, 130, 132, 0.32);
        border-radius: 7px;
        background:
          linear-gradient(180deg, rgba(17, 30, 36, 0.74), rgba(4, 9, 15, 0.94)),
          repeating-linear-gradient(90deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 42px);
      }
      .delta-raid-preview::before {
        content: "";
        position: absolute;
        inset: 22px 12px 24px;
        background:
          linear-gradient(90deg, transparent 0 42%, rgba(125, 211, 252, 0.22) 42% 43%, transparent 43%),
          linear-gradient(0deg, transparent 0 42%, rgba(251, 191, 36, 0.16) 42% 43%, transparent 43%),
          radial-gradient(circle at 34% 42%, rgba(34, 197, 94, 0.22), transparent 14%),
          radial-gradient(circle at 64% 58%, rgba(239, 68, 68, 0.18), transparent 15%);
        clip-path: polygon(6% 18%, 34% 8%, 54% 20%, 76% 14%, 94% 36%, 86% 76%, 62% 88%, 35% 76%, 12% 88%, 4% 55%);
      }
      .delta-raid-preview::after {
        content: "";
        position: absolute;
        inset: auto 18px 18px 18px;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(125, 211, 252, 0.56), transparent);
      }
      .delta-raid-preview strong,
      .delta-raid-preview span {
        position: relative;
        z-index: 1;
        display: block;
        margin-left: 18px;
      }
      .delta-raid-preview strong {
        margin-top: 16px;
        color: #f8fafc;
        font-size: 22px;
      }
      .delta-raid-preview span {
        color: #9fb2c8;
        font-size: 12px;
        font-weight: 850;
      }
      .delta-map-preview-dam {
        background:
          linear-gradient(180deg, rgba(13, 28, 35, 0.8), rgba(4, 9, 15, 0.94)),
          linear-gradient(90deg, transparent 0 48%, rgba(60, 92, 109, 0.46) 48% 58%, transparent 58%),
          repeating-linear-gradient(0deg, rgba(130, 148, 152, 0.12) 0 2px, transparent 2px 18px);
      }
      .delta-map-preview-nuclear {
        background:
          radial-gradient(circle at 74% 42%, rgba(212, 212, 216, 0.2), transparent 15%),
          linear-gradient(180deg, rgba(28, 33, 31, 0.82), rgba(5, 10, 14, 0.95)),
          repeating-linear-gradient(90deg, rgba(34, 197, 94, 0.08) 0 2px, transparent 2px 34px);
      }
      .delta-map-preview-space {
        background:
          linear-gradient(120deg, transparent 0 55%, rgba(251, 191, 36, 0.15) 55% 57%, transparent 57%),
          radial-gradient(circle at 30% 62%, rgba(56, 189, 248, 0.18), transparent 18%),
          linear-gradient(180deg, rgba(28, 34, 48, 0.84), rgba(4, 8, 15, 0.95));
      }
      .delta-hero-operator {
        min-height: 520px;
      }
      .delta-operator-portrait {
        min-height: 390px;
        overflow: hidden;
        background:
          radial-gradient(circle at 50% 20%, rgba(125, 211, 252, 0.12), transparent 28%),
          radial-gradient(circle at 50% 78%, rgba(2, 6, 14, 0.66), transparent 34%),
          linear-gradient(145deg, rgba(34, 47, 52, 0.72), rgba(2, 6, 14, 0.96)),
          repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.08) 0 1px, transparent 1px 42px);
      }
      .delta-operator-portrait::before {
        left: 50%;
        bottom: 12px;
        width: 216px;
        height: 320px;
        transform: translateX(-50%);
        border-radius: 72px 72px 34px 34px / 54px 54px 28px 28px;
        clip-path: polygon(30% 0, 70% 0, 84% 18%, 95% 55%, 84% 100%, 59% 100%, 54% 68%, 46% 68%, 41% 100%, 16% 100%, 5% 55%, 16% 18%);
        background:
          radial-gradient(ellipse at 50% 10%, rgba(170, 184, 190, 0.42) 0 18%, transparent 19%),
          linear-gradient(90deg, transparent 0 13%, rgba(10, 18, 26, 0.95) 13% 25%, transparent 25% 75%, rgba(10, 18, 26, 0.95) 75% 87%, transparent 87%),
          linear-gradient(90deg, transparent 0 42%, rgba(8, 13, 20, 0.82) 42% 46%, transparent 46% 54%, rgba(8, 13, 20, 0.82) 54% 58%, transparent 58%),
          linear-gradient(180deg, #66717a 0 19%, #303d46 20% 54%, #18222b 55% 100%);
        box-shadow:
          inset 0 26px 42px rgba(255, 255, 255, 0.08),
          inset 24px 0 34px rgba(255, 255, 255, 0.05),
          inset -30px 0 40px rgba(0, 0, 0, 0.48),
          0 28px 42px rgba(0, 0, 0, 0.48);
      }
      .delta-operator-portrait::after {
        left: 50%;
        top: 40px;
        width: 118px;
        height: 80px;
        transform: translateX(-50%);
        border-radius: 58px 58px 24px 24px / 44px 44px 20px 20px;
        background:
          linear-gradient(180deg, rgba(95, 106, 116, 0.96) 0 46%, rgba(9, 15, 26, 0.98) 46% 68%, rgba(73, 86, 96, 0.95) 68% 100%),
          radial-gradient(circle at 70% 20%, rgba(255, 255, 255, 0.18), transparent 22%);
        border-bottom: 9px solid rgba(125, 211, 252, 0.42);
        box-shadow:
          inset 0 8px 18px rgba(255, 255, 255, 0.08),
          inset 0 -18px 22px rgba(0, 0, 0, 0.44),
          0 6px 16px rgba(0, 0, 0, 0.5);
      }
      .delta-operator-portrait.has-operator-art {
        isolation: isolate;
        background-color: #101820;
        background-position: center 18%;
        background-repeat: no-repeat;
        background-size: cover;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 22px 44px rgba(0, 0, 0, 0.3);
      }
      .delta-operator-portrait.has-operator-art::before {
        display: none;
      }
      .delta-operator-portrait.has-operator-art::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 1;
        width: auto;
        height: auto;
        transform: none;
        border: 0;
        border-radius: 0;
        background: linear-gradient(180deg, transparent 54%, rgba(2, 6, 12, 0.36) 78%, rgba(2, 6, 12, 0.82));
        box-shadow: none;
        pointer-events: none;
      }
      .delta-operator-outline.has-operator-art {
        overflow: hidden;
        border-radius: 7px;
        background-color: #0f172a;
        background-position: center 16%;
        background-repeat: no-repeat;
        background-size: cover;
      }
      .delta-operator-outline.has-operator-art::before {
        display: none;
      }
      .delta-operator-outline.has-operator-art::after {
        inset: 0;
        width: auto;
        height: auto;
        transform: none;
        border: 0;
        border-radius: inherit;
        background: linear-gradient(180deg, transparent 48%, rgba(2, 6, 14, 0.62));
      }
      .delta-operator-card {
        grid-template-columns: 104px minmax(0, 1fr);
        min-height: 158px;
        padding: 10px;
      }
      .delta-operator-outline.has-operator-art {
        width: 94px;
        height: 136px;
        background-position: center 14%;
      }
      .delta-operator-card strong {
        font-size: 19px;
      }
      .delta-warehouse-command {
        display: grid;
        grid-template-columns: minmax(250px, 0.72fr) minmax(360px, 1fr) minmax(480px, 1.32fr);
        gap: 14px;
        align-items: stretch;
        min-height: 0;
      }
      .delta-warehouse-operator,
      .delta-warehouse-loadout,
      .delta-warehouse-storage {
        min-height: calc(100vh - 140px);
      }
      .delta-warehouse-storage .delta-warehouse-scroll {
        max-height: min(610px, calc(100vh - 248px));
      }
      .delta-secure-band .delta-warehouse-scroll {
        max-height: min(260px, calc(100vh - 460px));
      }
      .delta-warehouse-operator .delta-operator-portrait {
        min-height: 430px;
      }
      .delta-loadout-slots {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-top: 12px;
      }
      .delta-storage-grid {
        grid-template-columns: repeat(5, minmax(86px, 1fr));
        gap: 7px;
      }
      .delta-storage-grid .delta-inventory-item,
      .delta-storage-grid .delta-equipped-slot {
        min-height: 118px;
        padding: 8px;
        border-radius: 4px;
        background:
          linear-gradient(180deg, rgba(14, 25, 33, 0.86), rgba(5, 10, 16, 0.86)),
          repeating-linear-gradient(135deg, rgba(148, 163, 184, 0.04) 0 1px, transparent 1px 18px);
      }
      .delta-storage-grid .delta-inventory-item strong {
        font-size: 13px;
      }
      .delta-storage-grid .delta-inventory-item span {
        font-size: 10px;
      }
      .delta-storage-grid .delta-item-actions {
        grid-template-columns: 1fr;
        gap: 5px;
      }
      .delta-storage-grid .delta-inventory-item button {
        min-height: 28px;
        font-size: 11px;
      }
      .delta-secure-band {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(148, 163, 184, 0.18);
      }
      @keyframes realism-spin {
        to { transform: rotate(360deg); }
      }
      @keyframes realism-extract-rise {
        0% { opacity: 0; transform: translateY(24px) scale(0.96); }
        38% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0.92; transform: translateY(-18px) scale(1.04); }
      }
      @media (max-width: 820px) {
        .delta-topbar,
        .delta-grid,
        .delta-home,
        .delta-market-layout,
        .delta-warehouse-command {
          grid-template-columns: 1fr;
        }
        .realism-loadout-layout {
          grid-template-columns: 1fr;
        }
        .delta-tabs,
        .delta-market-grid,
        .delta-inventory-grid,
        .delta-operator-grid,
        .delta-stat-grid,
        .realism-loadout-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .delta-wallet {
          justify-items: start;
        }
        .delta-body {
          padding: 12px;
        }
        .delta-equipment-row {
          grid-template-columns: 1fr;
        }
        .delta-start-dock {
          right: 14px;
          bottom: 14px;
        }
        .delta-warehouse-operator,
        .delta-warehouse-loadout,
        .delta-warehouse-storage {
          min-height: auto;
        }
        .delta-warehouse-operator .delta-operator-portrait {
          min-height: 300px;
        }
        .realism-search-layout {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 520px) {
        .delta-tabs,
        .delta-market-grid,
        .delta-inventory-grid,
        .delta-operator-grid,
        .delta-stat-grid {
          grid-template-columns: 1fr;
        }
        .delta-brand strong {
          font-size: 20px;
        }
        .delta-hero-operator {
          min-height: 340px;
        }
        .realism-search-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .realism-loadout-grid {
          grid-template-columns: 1fr;
        }
        .delta-start-dock span {
          display: none;
        }
        #realism-player-status {
          left: 8px;
          bottom: 8px;
          width: calc(100vw - 16px);
          padding: 8px;
        }
        #realism-player-status .realism-status-head {
          margin-bottom: 5px;
        }
        #realism-player-status .realism-status-grid {
          display: none;
        }
        #realism-player-status .realism-health-track {
          height: 9px;
        }
      }
    `,document.head.appendChild(t)}function wn(e){Gt(e);const t=document.getElementById("realism-delta-ui");if(!t)return;const a=!e.session||e.session.screen==="menu";if(t.classList.toggle("is-visible",a),document.body?.classList.toggle("realism-menu-active",a),!a)return;const n=Date.now(),r=x(),o=t.dataset.tab==="exchange"&&!!r.pendingSale?.uid;(t.dataset.dirty==="1"||o&&n-Number(t.dataset.renderedAt||0)>900)&&se(e)}function se(e){const t=document.getElementById("realism-delta-ui");if(!t)return;const a=x(),n=gt(t.dataset.tab||a.selectedTab||"deploy");t.dataset.tab=n;const r=dt(a),o=ke(a);t.innerHTML=`
      <div class="delta-shell">
        <header class="delta-topbar">
          <div class="delta-brand">
            <span class="delta-mark"></span>
            <div>
              <strong>\u884C\u52A8\u4E2D\u5FC3</strong>
              <small>\u5730\u56FE / \u4ED3\u5E93 / \u9ED1\u5E02 / \u4EA4\u6613\u884C</small>
            </div>
          </div>
          <nav class="delta-tabs">
            ${ve("deploy","\u4E3B\u9875",n)}
            ${ve("warehouse","\u4ED3\u5E93",n)}
            ${ve("operators","\u7279\u6218\u5E72\u5458",n)}
            ${ve("market","\u9ED1\u5E02",n)}
            ${ve("exchange","\u4EA4\u6613\u884C",n)}
          </nav>
          <div class="delta-wallet">
            <span>\u6E38\u620F\u5E01</span>
            <strong>${V(a.coins)}</strong>
          </div>
        </header>
        <main class="delta-body">
          <section class="delta-page">
            ${vn(n,a,r,o,e)}
          </section>
        </main>
      </div>
    `,t.dataset.dirty="0",t.dataset.renderedAt=String(Date.now())}function ve(e,t,a){return`<button type="button" class="${a===e?"is-active":""}" data-ui-tab="${e}">${t}</button>`}function vn(e,t,a,n,r){return e==="warehouse"?Cn(t,n):e==="operators"?An(t):e==="market"?Dn(t):e==="exchange"?Rn(t):_n(t,a,n,r)}function _n(e,t,a){const n=Ce(e),r=X(e),o=Ae(e.deployMode||"raid"),i=yt(e);return`
      <div class="delta-home">
        ${o==="multi"&&e.multiplayerRole==="host"&&i?Sn(i):""}
        <div class="delta-panel delta-hero-operator">
          <div class="delta-operator-portrait has-operator-art" style="background-image: url('${y(t.portrait)}')" role="img" aria-label="${y(t.name)}\u5199\u5B9E\u5E72\u5458\u5F62\u8C61"></div>
          <div class="delta-operator-meta">
            <div class="delta-tag-row">
              <span class="delta-tag">${y(t.role)}</span>
              <span class="delta-tag">${y(t.name)}</span>
            </div>
            <strong>${y(t.name)}</strong>
            <p>${y(t.trait)}</p>
          </div>
        </div>
        <div class="delta-panel">
          <div class="delta-raid-brief">
            <span>\u70FD\u706B\u5730\u5E26</span>
            <strong>\u641C\u7D22\u7269\u8D44\u5E76\u64A4\u79BB</strong>
            <em>\u5E26\u51FA\u7684\u8D44\u6E90\u8FDB\u5165\u4ED3\u5E93\u7ECF\u6D4E\uFF1B\u5F53\u524D\u7248\u672C\u805A\u7126\u641C\u7D22\u3001\u6218\u6597\u3001\u64A4\u79BB\u548C\u5C40\u5916\u88C5\u5907\u7BA1\u7406\u3002</em>
          </div>
          ${Mn(r)}
          <h2>\u9009\u62E9\u5730\u56FE</h2>
          <p>\u5C0F\u5175\u6570\u91CF\u4F1A\u66F4\u591A\uFF0C\u4E0D\u4F1A\u590D\u6D3B\uFF1B\u5730\u56FE\u4F1A\u6309\u9009\u62E9\u7684\u533A\u57DF\u653E\u5927\u5E76\u52A0\u5165\u5BF9\u5E94\u5730\u6807\u3002</p>
          <div class="delta-map-grid">
            ${ue.map(s=>`
              <button type="button" class="delta-map-card ${r.id===s.id?"is-selected":""}" data-action="select-map" data-map-id="${s.id}">
                <strong>${y(s.name)}</strong>
                <span>${y(s.terrain)}</span>
              </button>
            `).join("")}
          </div>
          <h2 style="margin-top: 16px;">\u4F5C\u6218\u6A21\u5F0F</h2>
          <div class="delta-mode-grid">
            <button type="button" class="delta-mode-card ${o==="raid"?"is-selected":""}" data-action="select-mode" data-mode-id="raid">
              <strong>\u5355\u4EBA\u7A81\u88AD</strong>
              <span>\u641C\u7D22\u3001\u64A4\u79BB\u3001\u5C0F\u5175\u6218\u6597</span>
            </button>
            <button type="button" class="delta-mode-card ${o==="multi"?"is-selected":""}" data-action="select-mode" data-mode-id="multi">
              <strong>\u591A\u4EBA\u6E38\u620F</strong>
              <span>\u623F\u4E3B\u9080\u8BF7\u7801 / \u623F\u5BA2\u8F93\u5165</span>
            </button>
          </div>
          ${o==="multi"?kn(e):""}
          <div class="delta-stat-grid">
            <div class="delta-stat"><span>\u547D\u4E2D\u4F24\u5BB3</span><strong>${n}</strong></div>
            <div class="delta-stat"><span>\u641C\u7D22\u952E</span><strong>L</strong></div>
            <div class="delta-stat"><span>\u81EA\u8EAB\u53D7\u5F39</span><strong>${a.incomingDamage}</strong></div>
          </div>
          <div class="delta-action-row" style="margin-top: 14px;">
            <button type="button" data-ui-tab="market">\u9ED1\u5E02\u91C7\u8D2D</button>
            <button type="button" data-ui-tab="exchange">\u4EA4\u6613\u884C</button>
            <button type="button" data-ui-tab="operators">\u7279\u6218\u5E72\u5458</button>
          </div>
          <div class="delta-note">\u6218\u6597\u4E2D\u6309 E \u4F7F\u7528\u6280\u80FD\uFF0C\u6309 L \u641C\u7D22\u5BB9\u5668\uFF0C\u641C\u7D22\u754C\u9762\u7528\u65B9\u5411\u952E\u9009\u7269\u54C1\uFF0C\u6309 M \u62FE\u53D6\uFF0C\u6309 N \u5173\u95ED\uFF1BQ \u56DE\u8840\uFF0CX \u8FC5\u6377\u3002</div>
        </div>
        <div class="delta-start-dock">
          <span>${o==="multi"?`\u591A\u4EBA\u6E38\u620F${i?`\uFF1A${y(i)}`:""}`:`\u5F53\u524D\u5730\u56FE\uFF1A${y(r.name)}`}</span>
          <button type="button" class="delta-start-button" data-action="start">\u5F00\u59CB\u6E38\u620F</button>
        </div>
      </div>
    `}function Mn(e){return`
      <div class="delta-raid-preview delta-map-preview-${y(e.id)}">
        <strong>${y(e.name)}</strong>
        <span>${y(e.terrain)}</span>
      </div>
    `}function Sn(e){return`
      <div class="delta-invite-badge">
        <span>\u623F\u95F4\u9080\u8BF7\u7801</span>
        <strong>${y(e)}</strong>
      </div>
    `}function kn(e){const t=We(e.multiplayerRole||"host"),a=yt(e);return`
      <div class="delta-multiplayer-panel">
        <div class="delta-host-row">
          <button type="button" class="delta-mode-card ${t==="host"?"is-selected":""}" data-action="select-multi-role" data-role-id="host">
            <strong>\u6211\u662F\u623F\u4E3B</strong>
            <span>\u521B\u5EFA\u623F\u95F4\uFF0C\u5DE6\u4E0A\u89D2\u663E\u793A\u9080\u8BF7\u7801</span>
          </button>
          <button type="button" class="delta-mode-card ${t==="guest"?"is-selected":""}" data-action="select-multi-role" data-role-id="guest">
            <strong>\u6211\u662F\u623F\u5BA2</strong>
            <span>\u8F93\u5165\u623F\u4E3B\u7684\u9080\u8BF7\u7801\u52A0\u5165</span>
          </button>
        </div>
        ${t==="host"?`
          <div class="delta-invite-row">
            <span class="delta-invite-chip">${y(a||"----")}</span>
            <button type="button" data-action="create-room">\u521B\u5EFA\u623F\u95F4</button>
          </div>
          <div class="delta-note">\u628A\u5DE6\u4E0A\u89D2\u7684\u9080\u8BF7\u7801\u53D1\u7ED9\u522B\u4EBA\u3002\u623F\u5BA2\u8F93\u5165\u540E\u4F1A\u8FDB\u5165\u540C\u4E00\u4E2A\u623F\u95F4\uFF0C\u961F\u4F0D\u7531\u623F\u95F4\u968F\u673A/\u81EA\u52A8\u5206\u914D\u3002</div>
        `:`
          <div class="delta-invite-row">
            <input id="delta-invite-input" class="delta-invite-input" value="${y(a||"")}" maxlength="6" placeholder="\u9080\u8BF7\u7801">
            <button type="button" data-action="join-invite">\u8FDB\u5165\u623F\u95F4</button>
          </div>
          <div class="delta-note">\u8F93\u5165\u623F\u4E3B\u5DE6\u4E0A\u89D2\u7684\u9080\u8BF7\u7801\uFF0C\u518D\u70B9\u8FDB\u5165\u623F\u95F4\u3002</div>
        `}
      </div>
    `}function Cn(e,t){const a=dt(e),n=Z(e),r=Sa(e),o=fe(e),i=ka(e);return`
      <div class="delta-warehouse-command delta-warehouse-page">
        <div class="delta-panel delta-warehouse-operator">
          <h2>\u4ED3\u5E93</h2>
          <p>\u88C5\u5907\u3001\u7269\u8D44\u548C\u5E26\u51FA\u7269\u96C6\u4E2D\u7BA1\u7406\u3002</p>
          <div class="delta-operator-portrait has-operator-art" style="background-image: url('${y(a.portrait)}')" role="img" aria-label="${y(a.name)}\u5199\u5B9E\u5E72\u5458\u5F62\u8C61"></div>
          <div class="delta-operator-meta">
            <div class="delta-tag-row">
              <span class="delta-tag">\u9632\u62A4 ${Math.round(t.protection*100)}%</span>
              <span class="delta-tag">\u80CC\u5305 ${i.used} / ${i.capacity}</span>
            </div>
            <strong>\u5F53\u524D\u914D\u88C5</strong>
            <p>\u5DE6\u4FA7\u89D2\u8272\uFF0C\u4E2D\u95F4\u88C5\u5907\u69FD\uFF0C\u53F3\u4FA7\u7269\u8D44\u7F51\u683C\u3002</p>
          </div>
        </div>
        <div class="delta-panel delta-warehouse-loadout">
          <h2>\u914D\u88C5</h2>
          <p>\u9ED1\u5E02\u8D2D\u4E70\u540E\u5728\u8FD9\u91CC\u88C5\u5907\uFF1B\u6218\u6597\u5931\u8D25\u4F1A\u4E22\u5931\u8EAB\u4E0A\u88C5\u5907\uFF0C\u52A0\u5BC6\u7BB1\u4FDD\u7559\u3002</p>
          <div class="delta-loadout-slots">
            ${Te(e)}
            ${ee("\u80F8\u6302",W(e,"chestRig"))}
            ${ee("\u5934\u76D4",t.helmet)}
            ${ee("\u80F8\u7532",t.armor)}
            ${ee("\u80CC\u5305",W(e,"backpack"))}
            ${tt(e)}
            ${et(e)}
          </div>
          <div class="delta-note">\u88AB\u51FB\u4E2D\u6BCF\u53D1\u627F\u53D7 ${t.incomingDamage} \u4F24\u5BB3\u3002\u67AA\u68B0\u6CA1\u6709\u914D\u4EF6\u65F6\u4FDD\u6301\u88F8\u67AA\u72B6\u6001\uFF1A\u9AD8\u540E\u5750\u529B\u3001\u65E0\u6FC0\u5149\u3001\u65E0\u7784\u51C6\u955C\u3002</div>
          <div class="delta-secure-band">
            <h3>\u52A0\u5BC6\u7BB1 ${o.length} / 4</h3>
            <div class="realism-loadout-grid" style="margin-top: 10px;">${Jt(o)}</div>
            ${o.length?`<div class="delta-inventory-scroll delta-warehouse-scroll" tabindex="0" role="region" aria-label="\u52A0\u5BC6\u7BB1\u7269\u54C1\u5217\u8868" style="margin-top: 12px;"><div class="delta-inventory-grid">${o.map(s=>$e(s,e)).join("")}</div></div>`:""}
          </div>
        </div>
        <div class="delta-panel delta-warehouse-storage">
          <h2>\u4ED3\u5E93\u7269\u8D44</h2>
          ${r.length?`<div class="delta-inventory-scroll delta-warehouse-scroll" tabindex="0" role="region" aria-label="\u4ED3\u5E93\u7269\u8D44\u5217\u8868"><div class="delta-inventory-grid delta-storage-grid">${r.map(s=>$e(s,e)).join("")}</div></div>`:`<div class="delta-empty">\u4ED3\u5E93\u73B0\u5728\u662F\u7A7A\u7684<br>\u4F60\u6709 ${V(e.coins)} \u6E38\u620F\u5E01\uFF0C\u53EF\u4EE5\u53BB\u9ED1\u5E02\u8D2D\u4E70\u88C5\u5907\u3002</div>`}
          <div class="delta-secure-band">
            <h3>\u80CC\u5305\u53D8\u5356\u7269</h3>
            ${n.length?`<div class="delta-inventory-scroll delta-warehouse-scroll" tabindex="0" role="region" aria-label="\u80CC\u5305\u53D8\u5356\u7269\u5217\u8868"><div class="delta-inventory-grid delta-storage-grid">${n.map(s=>$e(s,e)).join("")}</div></div>`:'<div class="delta-empty">\u80CC\u5305\u91CC\u8FD8\u6CA1\u6709\u53D8\u5356\u7269<br>\u8FDB\u5730\u56FE\u641C\u7D22\u5BB9\u5668\u540E\u4F1A\u653E\u5230\u8FD9\u91CC\u3002</div>'}
          </div>
        </div>
      </div>
    `}function An(e){return`
      <div class="delta-panel">
        <h2>\u7279\u6218\u5E72\u5458</h2>
        <p>\u9009\u62E9\u5E72\u5458\u4F1A\u540C\u6B65\u5230\u90E8\u7F72\u5927\u5385\uFF1B\u539F\u6E38\u620F\u5DF2\u6709\u7684\u5E72\u5458\u4F1A\u5C3D\u91CF\u540C\u6B65\u5230\u539F\u9009\u62E9\u6309\u94AE\u3002</p>
        <div class="delta-operator-grid" style="margin-top: 14px;">
          ${xe.map(t=>`
            <button type="button" class="delta-operator-card ${e.equipped?.operator===t.id?"is-selected":""}" data-action="select-operator" data-operator-id="${t.id}">
              <span class="delta-operator-outline has-operator-art" style="background-image: url('${y(t.portrait)}')" aria-hidden="true"></span>
              <span class="delta-operator-copy">
                <span>${y(t.role)}</span>
                <strong>${y(t.name)}</strong>
                <span>${y(t.trait)}</span>
              </span>
            </button>
          `).join("")}
        </div>
      </div>
    `}function Dn(e){const t=xt(e.marketCategory||"medicine");return`
      <div class="delta-panel">
        <h2>\u9ED1\u5E02</h2>
        <p>\u5DE6\u8FB9\u9009\u62E9\u5927\u7C7B\u3002\u88C5\u5907\u6309\u767D\u3001\u7EFF\u3001\u84DD\u3001\u9EC4\u3001\u7EA2\u4ECE\u5DE6\u5230\u53F3\u8D8A\u6765\u8D8A\u5F3A\u3002</p>
        <div class="delta-market-layout">
          <aside class="delta-market-rail">
            ${Et.map(a=>`<button type="button" class="${t===a.id?"is-active":""}" data-market-category="${a.id}">${y(a.label)}</button>`).join("")}
          </aside>
          <div class="delta-inventory-scroll delta-market-scroll" tabindex="0" role="region" aria-label="\u9ED1\u5E02\u5546\u54C1\u5217\u8868">
            ${In(t,e)}
          </div>
        </div>
      </div>
    `}function In(e,t){return e==="equipment"?En(t):e==="weaponry"?[_e("\u67AA\u68B0",$t,t),_e("\u67AA\u68B0\u914D\u4EF6",Pt,t),_e("\u5B50\u5F39",Lt,t)].join(""):e==="tactical"?_e("\u6218\u672F\u9053\u5177",Ke,t):_e("\u836F\u54C1",Nt,t)}function En(e){return`
      <div class="delta-equipment-band">
        ${Rt.map(t=>`
          <div class="delta-equipment-row">
            <div class="delta-equipment-label">${y(t.label)}</div>
            ${Ee.map(a=>{const n=zt.find(r=>r.slot===t.id&&r.tier===a.id);return n?Je(n,e):""}).join("")}
          </div>
        `).join("")}
      </div>
    `}function Rn(e){const t=e.pendingSale||null,a=(e.inventory||[]).filter(n=>w(n.defId)?.type==="loot");return`
      <div class="delta-grid">
        <div class="delta-panel">
          <h2>\u4EA4\u6613\u884C</h2>
          <p>\u6218\u6597\u91CC\u6309 L \u641C\u7D22\u5BB9\u5668\uFF0C\u6361\u5230\u7684\u53D8\u5356\u7269\u4F1A\u653E\u8FDB\u4ED3\u5E93\uFF0C\u5728\u8FD9\u91CC\u5356\u6210\u6E38\u620F\u5E01\u3002\u4EF7\u503C\u8D8A\u9AD8\uFF0C\u653E\u5927\u955C\u8F6C\u5F97\u8D8A\u4E45\u3002</p>
          <div class="delta-stat-grid">
            <div class="delta-stat"><span>\u53EF\u51FA\u552E</span><strong>${a.length}</strong></div>
            <div class="delta-stat"><span>\u6700\u9AD8\u4EF7\u503C</span><strong>\u975E\u6D32\u4E4B\u661F</strong></div>
            <div class="delta-stat"><span>\u6700\u9AD8\u552E\u4EF7</span><strong>10,000,000</strong></div>
          </div>
        </div>
        <div class="delta-panel">
          <h2>\u53D8\u5356\u7269</h2>
          ${a.length?`<div class="delta-inventory-scroll delta-exchange-scroll" tabindex="0" role="region" aria-label="\u4EA4\u6613\u884C\u7269\u54C1\u5217\u8868"><div class="delta-inventory-grid">${a.map(n=>$n(n,e,t)).join("")}</div></div>`:'<div class="delta-empty">\u8FD8\u6CA1\u6709\u6361\u5230\u53EF\u51FA\u552E\u7269<br>\u8FDB\u5730\u56FE\u641C\u7D22\u5BB9\u5668\u540E\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002</div>'}
        </div>
        <div class="delta-panel">
          <h2>\u6218\u672F\u9053\u5177</h2>
          <p>\u624B\u96F7\u6309 G \u6295\u63B7\uFF0C\u95EA\u5149\u5F39\u6309 H \u6295\u63B7\u3002\u9053\u5177\u4F1A\u4ECE\u4ED3\u5E93\u6D88\u8017\u3002</p>
          <div class="delta-market-grid">
            ${Ke.map(n=>Je(n,e)).join("")}
          </div>
        </div>
      </div>
    `}function Ti(e){const t=W(e,"weapon"),a=(e.inventory||[]).filter(n=>["weapon","attachment","ammo"].includes(w(n.defId)?.type));return`
      <div class="delta-grid">
        <div class="delta-panel">
          <h2>\u67AA\u5320</h2>
          <div class="delta-weapon-preview">
            <div class="delta-rifle ${ft(e)?"has-4x":""}"><span></span><i></i></div>
          </div>
          <div class="delta-equipped-row" style="margin-top: 12px;">
            ${Te(e)}
            ${tt(e)}
            ${et(e)}
          </div>
          <div class="delta-note">${t?`${y(t.name)} \u5DF2\u63A5\u5165\u539F\u6B66\u5668\u901A\u9053\u3002`:"\u672A\u8D2D\u4E70\u67AA\u68B0\u65F6\u4F7F\u7528\u539F\u59CB\u7A81\u51FB\u6B65\u67AA\u3002"} \u56DB\u500D\u955C\u53EA\u80FD\u88C5\u5728 AWM \u6216\u5C04\u624B\u6B65\u67AA\u8FD9\u7C7B\u72D9\u51FB\u67AA\u4E0A\u3002</div>
        </div>
        <div class="delta-panel">
          <h2>\u6B66\u5668\u5E93</h2>
          ${a.length?`<div class="delta-inventory-scroll"><div class="delta-inventory-grid">${a.map(n=>$e(n,e)).join("")}</div></div>`:'<div class="delta-empty">\u8FD8\u6CA1\u6709\u8D2D\u4E70\u67AA\u68B0\u3001\u914D\u4EF6\u6216\u5B50\u5F39<br>\u53BB\u9ED1\u5E02\u8D2D\u4E70\u540E\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002</div>'}
        </div>
      </div>
    `}function _e(e,t,a){return`
      <div class="delta-market-section">
        <h3>${y(e)}</h3>
        <div class="delta-market-grid">
          ${t.map(n=>Je(n,a)).join("")}
        </div>
      </div>
    `}function Je(e,t){const a=oo(t,e.id),n=t.coins>=e.cost;return`
      <div class="delta-market-card" ${e.color?`style="border-color: ${e.color};"`:""}>
        <span>${y(Aa(e))}${a?` / \u5DF2\u6709 ${a}`:""}</span>
        <strong>${y(e.name)}</strong>
        <span>${y(e.meta||"")}</span>
        <span>${V(e.cost)} \u6E38\u620F\u5E01</span>
        <button type="button" data-action="buy" data-item-id="${e.id}" ${n?"":"disabled"}>${n?"\u8D2D\u4E70":"\u4F59\u989D\u4E0D\u8DB3"}</button>
      </div>
    `}function $e(e,t){const a=w(e.defId);if(!a)return"";const n=mt(t,e.uid),r=j(t,e.uid),o=so(e,a),i=a.color?`style="border-color: ${a.color};"`:"",s=io(a,n);return`
      <div class="delta-inventory-item ${n?"is-equipped":""}" ${i}>
        <span>${y(Aa(a))}${n?" / \u5DF2\u88C5\u5907":""}${r?" / \u52A0\u5BC6\u7BB1":""}</span>
        <strong>${y(a.name)}</strong>
        <span>${y(a.meta||"")}</span>
        ${o?`<span>${y(o)}</span>`:""}
        <div class="delta-item-actions">
          ${r?'<button type="button" disabled>\u5148\u79FB\u51FA</button>':`<button type="button" data-action="${s.id}" data-item-uid="${e.uid}">${s.label}</button>`}
          ${zn(e,t,n)}
          ${Pn(e,a,n||r)}
        </div>
      </div>
    `}function zn(e,t,a){if(a)return'<button type="button" disabled>\u5DF2\u88C5\u5907</button>';if(j(t,e.uid))return`<button type="button" data-action="unsecure-item" data-item-uid="${e.uid}">\u79FB\u51FA\u52A0\u5BC6\u7BB1</button>`;const o=fe(t).length>=4;return`<button type="button" data-action="secure-item" data-item-uid="${e.uid}" ${o?"disabled":""}>${o?"\u52A0\u5BC6\u7BB1\u5DF2\u6EE1":"\u653E\u5165\u52A0\u5BC6\u7BB1"}</button>`}function Pn(e,t,a){const n=Ca(t);return n?`<button type="button" data-action="sell-warehouse" data-item-uid="${e.uid}" ${a?"disabled":""}>${a?"\u5148\u5378\u4E0B":`\u51FA\u552E ${V(n)}`}</button>`:""}function $n(e,t,a){const n=w(e.defId);if(!n)return"";const r=a?.uid===e.uid,o=r?Math.max(0,Number(a.untilMs||0)-Date.now()):0,i=r?`\u9274\u5B9A\u4E2D ${Math.ceil(o/1e3)}\u79D2`:"\u51FA\u552E";return`
      <div class="delta-inventory-item ${r?"delta-sale-pending":""}" style="border-color: ${n.color||"#94a3b8"};">
        <span>${y(n.meta||"\u53D8\u5356\u7269")}</span>
        <strong>${y(n.name)}</strong>
        <span>\u4EF7\u503C ${V(n.value)} \u6E38\u620F\u5E01</span>
        <span>${r?'<span class="delta-sale-glass"></span>\u6B63\u5728\u4F30\u4EF7':`\u989C\u8272\u7B49\u7EA7\uFF1A${y(po(n.tier))}`}</span>
        <button type="button" data-action="sell-loot" data-item-uid="${e.uid}" ${r?"disabled":""}>${i}</button>
      </div>
    `}function ee(e,t){return`
      <div class="delta-equipped-slot" ${t?.color?`style="border-color: ${t.color};"`:""}>
        <span>${y(e)}</span>
        <strong>${t?y(t.name):"\u672A\u88C5\u5907"}</strong>
        <span>${t?y(t.meta||""):"\u53BB\u9ED1\u5E02\u8D2D\u4E70\u540E\u53EF\u88C5\u5907"}</span>
      </div>
    `}function Te(e){const t=W(e,"weapon");return`
      <div class="delta-equipped-slot">
        <span>\u4E3B\u6B66\u5668</span>
        <strong>${t?y(t.name):"\u539F\u59CB\u7A81\u51FB\u6B65\u67AA"}</strong>
        <span>${t?y(t.meta||""):"\u53EF\u5728\u9ED1\u5E02\u8D2D\u4E70\u91CE\u725B\u3001\u817E\u9F99\u3001AWM \u7B49\u67AA\u68B0"}</span>
      </div>
    `}function et(e){const t=le(e),a=t?w(t.defId):null;return`
      <div class="delta-equipped-slot" ${a?.color?`style="border-color: ${a.color};"`:""}>
        <span>\u5F53\u524D\u5B50\u5F39</span>
        <strong>${a?y(a.name):"\u672A\u88C5\u5907"}</strong>
        <span>${a?`${Math.round(t.remaining||0)} / ${a.rounds} \u53D1`:"\u666E\u901A\u5F39 60 \u53D1\u4E00\u7EC4\uFF0CAWM \u5F39 14 \u53D1\u4E00\u7EC4"}</span>
      </div>
    `}function tt(e){const t=Oe(e),a=t.attachments,n=a.length?a.map(o=>o.name).join(" / "):"\u88F8\u67AA",r=a.length?`${t.optic?t.optic.name:"\u65E0\u7784\u51C6\u955C"} / ${t.laser?"\u6FC0\u5149\u5F00\u542F":"\u65E0\u6FC0\u5149"} / \u540E\u5750\u529B${Fe(e).recoilLabel}`:"\u65E0\u7784\u51C6\u955C / \u65E0\u6FC0\u5149 / \u540E\u5750\u529B\u9AD8";return`
      <div class="delta-equipped-slot">
        <span>\u67AA\u68B0\u914D\u4EF6</span>
        <strong>${y(n)}</strong>
        <span>${y(r)}</span>
      </div>
    `}function Ln(e,t){const a=e.target.closest("button[data-ui-tab], button[data-action], button[data-market-category]");if(!a||!a.closest("#realism-delta-ui"))return;if(e.preventDefault(),a.dataset.marketCategory){const i=x();i.marketCategory=xt(a.dataset.marketCategory),A(i),k(),se(t);return}const n=a.dataset.uiTab,r=document.getElementById("realism-delta-ui");if(n){const i=x();r.dataset.tab=gt(n),i.selectedTab=r.dataset.tab,A(i),k(),se(t);return}const o=a.dataset.action;if(o==="start"){const i=x();if(st(i),qe(t,!0),Ae(i.deployMode)==="multi"&&!jr(t,i))return;wa(t,i.deployMode);return}o==="select-map"&&Xr(a.dataset.mapId,t),o==="select-mode"&&Ur(a.dataset.modeId,t),o==="select-multi-role"&&Yr(a.dataset.roleId,t),o==="create-room"&&Gr(t),o==="join-invite"&&Zr(t),o==="buy"&&qr(a.dataset.itemId,t),o==="sell-loot"&&Vr(a.dataset.itemUid,t),o==="sell-warehouse"&&Qr(a.dataset.itemUid,t),o==="select-operator"&&Wr(a.dataset.operatorId,t),o==="carry-tactical"&&Jr(a.dataset.itemUid,t),o==="equip-item"&&to(a.dataset.itemUid,t),o==="unequip-item"&&ao(a.dataset.itemUid,t),o==="secure-item"&&Tr(a.dataset.itemUid,t),o==="unsecure-item"&&eo(a.dataset.itemUid,t),o==="use-medicine"&&Fr(a.dataset.itemUid,t),se(t)}function Nn(e){const t=document.getElementById("realism-delta-ui");if(!t?.classList.contains("is-visible"))return;const a=e.target,n=a?.closest?.(".delta-inventory-scroll"),r=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX,o=a?.closest?.(".delta-body")||t.querySelector(".delta-body"),i=[n,o].filter(Boolean);for(const s of i)if(Bn(s,r)){e.preventDefault(),e.stopPropagation();return}}function Bn(e,t){const a=Math.max(0,e.scrollHeight-e.clientHeight);if(a<=0)return!1;const n=e.scrollTop,r=Math.max(0,Math.min(a,n+t));return r===n?!1:(e.scrollTop=r,e.scrollTop!==n)}function Zt(){if(document.getElementById("realism-player-status"))return;const e=document.createElement("div");e.id="realism-player-status",document.body.appendChild(e)}function jt(){if(document.getElementById("realism-search-panel"))return;const e=document.createElement("div");e.id="realism-search-panel",e.addEventListener("click",t=>tr(t,window.__FPS_GAME__)),document.body.appendChild(e)}function Vt(){if(document.getElementById("realism-loadout-panel"))return;const e=document.createElement("div");e.id="realism-loadout-panel",document.body.appendChild(e)}function Kt(){if(!document.getElementById("realism-extract-panel")){const e=document.createElement("div");e.id="realism-extract-panel",document.body.appendChild(e)}if(!document.getElementById("realism-extract-cinematic")){const e=document.createElement("div");e.id="realism-extract-cinematic",e.innerHTML='<div class="realism-extract-card"><strong>\u64A4\u79BB\u6210\u529F</strong><span>\u7269\u8D44\u5DF2\u5E26\u51FA\uFF0C\u6B63\u5728\u8FD4\u56DE\u884C\u52A8\u4E2D\u5FC3</span></div>',document.body.appendChild(e)}}function Qt(){if(document.getElementById("realism-raid-fail-cinematic"))return;const e=document.createElement("div");e.id="realism-raid-fail-cinematic",e.innerHTML='<div class="realism-extract-card"><strong>\u64A4\u79BB\u5931\u8D25</strong><span>\u8EAB\u4E0A\u7269\u54C1\u5DF2\u4E22\u5931\uFF0C\u4ED3\u5E93\u7269\u54C1\u4FDD\u7559</span></div>',document.body.appendChild(e)}function Hn(e){Zt();const t=document.getElementById("realism-player-status");if(!t)return;const a=e.session?.screen==="playing";if(t.classList.toggle("is-visible",a),document.body?.classList.toggle("realism-raid-playing",a),!a)return;const n=x(),r=He(e),o=ke(n),i=it(n),s=ya(n),l=te(n),d=le(n),c=d?w(d.defId):null,u=fe(n);t.innerHTML=`
      <div class="realism-status-head">
        <strong>\u81EA\u8EAB\u72B6\u6001</strong>
        <span>${Math.round(r)} / 100 \u8840\u91CF</span>
      </div>
      <div class="realism-health-track">
        <div class="realism-health-fill" style="width:${Math.max(0,Math.min(100,r))}%;"></div>
      </div>
      <div class="realism-status-grid">
        <span>\u4E3B\u6B66\u5668\uFF1A${l?y(l.name):"\u539F\u59CB\u7A81\u51FB\u6B65\u67AA"}</span>
        <span>\u5B50\u5F39\uFF1A${c?`${y(c.name)} ${Math.round(d.remaining||0)}`:"\u672A\u88C5\u5907"}</span>
        <span>\u547D\u4E2D\u4F24\u5BB3\uFF1A${Ce(n)}</span>
        <span>\u672C\u5C40\u65F6\u95F4\uFF1A${Jn(e)}</span>
        <span>\u62A4\u7532\uFF1A${o.armor?y(o.armor.name):"\u65E0"}</span>
        <span>\u5934\u76D4\uFF1A${o.helmet?y(o.helmet.name):"\u65E0"}</span>
        <span>\u9632\u62A4\uFF1A${Math.round(o.protection*100)}%</span>
        <span>\u56DE\u8840\u6C60\uFF1A${Math.round(s)}</span>
        <span>\u8FC5\u6377\uFF1A${i>0?`${i.toFixed(1)} \u79D2`:"\u672A\u751F\u6548"}</span>
        <span>\u914D\u88C5\uFF1A\u6309 V \u67E5\u770B</span>
        <span>\u52A0\u5BC6\u7BB1\uFF1A${u.length} / 4</span>
        <span>E \u6280\u80FD / L \u641C\u7D22 / M \u62FE\u53D6 / N \u5173\u95ED / Q \u56DE\u8840 / X \u8FC5\u6377</span>
      </div>
    `}function On(e){Vt();const t=document.getElementById("realism-loadout-panel");if(!t)return;const a=!!e.__realismLoadoutOpen&&e.session?.screen==="playing";if(t.classList.toggle("is-visible",a),!a)return;const n=x();Me(e,n),t.innerHTML=Fn(e,n)}function Fn(e,t){const a=ke(t),n=Z(t),r=fe(t),o=Number.isFinite(e.__realismBackpackSelectedIndex)?e.__realismBackpackSelectedIndex:-1;return`
      <div class="realism-loadout-head">
        <strong>\u914D\u88C5</strong>
        <span>\u65B9\u5411\u952E\u9009\u62E9\u80CC\u5305\u7269\u54C1 / M \u4E22\u5F03 / B \u653E\u5165\u52A0\u5BC6\u7BB1 / V \u5173\u95ED</span>
      </div>
      <div class="realism-loadout-layout">
        <section class="realism-loadout-section">
          <h3>\u8EAB\u4E0A\u88C5\u5907</h3>
          <div class="delta-equipped-row">
            ${Te(t)}
            ${ee("\u80F8\u6302",W(t,"chestRig"))}
            ${ee("\u5934\u76D4",a.helmet)}
            ${ee("\u80F8\u7532",a.armor)}
            ${ee("\u80CC\u5305",W(t,"backpack"))}
            ${tt(t)}
            ${et(t)}
          </div>
        </section>
        <section class="realism-loadout-section">
          <h3>\u80CC\u5305</h3>
          ${n.length?`<div class="realism-loadout-grid">${n.map((i,s)=>qn(i,s===o)).join("")}</div>`:'<div class="delta-empty">\u80CC\u5305\u91CC\u6CA1\u6709\u7269\u54C1<br>\u9760\u8FD1\u5BB9\u5668\u6309 L \u641C\u7D22\uFF0C\u6216\u8BEF\u5173\u540E\u6309 N \u91CD\u5F00\u3002</div>'}
        </section>
        <section class="realism-loadout-section">
          <h3>\u52A0\u5BC6\u7BB1 ${r.length} / 4</h3>
          <div class="realism-loadout-grid">${Jt(r)}</div>
        </section>
      </div>
    `}function qn(e,t){const a=w(e.defId);if(!a)return"";const n=a.color?`style="border-color: ${a.color};"`:"";return`
      <div class="realism-loadout-item ${t?"is-selected":""}" ${n}>
        <span>${y(a.meta||"\u80CC\u5305\u7269\u54C1")}</span>
        <strong>${y(a.name)}</strong>
        <span>\u4EF7\u503C ${V(a.value||0)}</span>
        <span>${t?"M \u4E22\u5F03 / B \u52A0\u5BC6":"\u65B9\u5411\u952E\u9009\u62E9"}</span>
      </div>
    `}function Jt(e){const t=[];for(let a=0;a<4;a+=1){const n=e[a];if(!n){t.push(`<div class="realism-loadout-item is-empty"><span>\u52A0\u5BC6\u7BB1\u683C ${a+1}</span><strong>\u7A7A</strong><span>\u53EF\u4FDD\u62A4\u5E26\u51FA</span></div>`);continue}const r=w(n.defId),o=r?.color?`style="border-color: ${r.color};"`:"";t.push(`
        <div class="realism-loadout-item" ${o}>
          <span>${y(r?.meta||"\u52A0\u5BC6\u7BB1\u7269\u54C1")}</span>
          <strong>${y(r?.name||"\u672A\u77E5\u7269\u54C1")}</strong>
          <span>\u64A4\u79BB\u5931\u8D25\u4E5F\u4FDD\u7559</span>
        </div>
      `)}return t.join("")}function Me(e,t=x()){const a=Z(t);if(!a.length){e.__realismBackpackSelectedIndex=-1;return}const n=Number.isFinite(e.__realismBackpackSelectedIndex)?e.__realismBackpackSelectedIndex:0;e.__realismBackpackSelectedIndex=Math.max(0,Math.min(a.length-1,n))}function Wn(e){if(!e?.session||e.session.screen!=="playing"){h(e,"\u8FDB\u5165\u6218\u6597\u540E\u624D\u80FD\u67E5\u770B\u914D\u88C5");return}e.__realismLoadoutOpen=!e.__realismLoadoutOpen,e.__realismLoadoutOpen?(Me(e),h(e,"\u5DF2\u6253\u5F00\u914D\u88C5")):h(e,"\u5DF2\u5173\u95ED\u914D\u88C5")}function Xn(e,t){if(!e.__realismLoadoutOpen)return!1;const a=Z();if(!a.length)return e.__realismBackpackSelectedIndex=-1,h(e,"\u80CC\u5305\u91CC\u6CA1\u6709\u53EF\u9009\u62E9\u7269\u54C1"),!0;Me(e);const n=3,r=Number.isFinite(e.__realismBackpackSelectedIndex)?e.__realismBackpackSelectedIndex:0,o=t==="ArrowLeft"?-1:t==="ArrowRight"?1:t==="ArrowUp"?-n:n,i=(r+o+a.length)%a.length;e.__realismBackpackSelectedIndex=i;const s=w(a[i]?.defId);return s&&h(e,`\u80CC\u5305\u9009\u4E2D\uFF1A${s.name}`),!0}function Un(e){if(!e.__realismLoadoutOpen)return!1;const t=x(),a=Z(t);if(!a.length)return h(e,"\u80CC\u5305\u91CC\u6CA1\u6709\u53EF\u4E22\u5F03\u7269\u54C1"),!0;Me(e,t);const n=Number.isFinite(e.__realismBackpackSelectedIndex)?e.__realismBackpackSelectedIndex:0,r=a[n],o=w(r?.defId);return!r||!o||(t.inventory=(t.inventory||[]).filter(i=>i.uid!==r.uid),t.pendingSale?.uid===r.uid&&(t.pendingSale=null),A(t),e.__realismBackpackSelectedIndex=Math.min(n,Math.max(0,Z(t).length-1)),h(e,`\u5DF2\u4E22\u5F03\uFF1A${o.name}`),k()),!0}function Yn(e){if(!e.__realismLoadoutOpen)return!1;const t=x(),a=Z(t);if(!a.length)return h(e,"\u80CC\u5305\u91CC\u6CA1\u6709\u53EF\u653E\u5165\u52A0\u5BC6\u7BB1\u7684\u7269\u54C1"),!0;if(fe(t).length>=4)return h(e,"\u52A0\u5BC6\u7BB1\u5DF2\u6EE1"),!0;Me(e,t);const n=Number.isFinite(e.__realismBackpackSelectedIndex)?e.__realismBackpackSelectedIndex:0,r=a[n],o=w(r?.defId);return!r||!o||(t.secureContainer=Array.isArray(t.secureContainer)?t.secureContainer:[],t.secureContainer.includes(r.uid)||t.secureContainer.push(r.uid),r.location="secure",A(t),e.__realismBackpackSelectedIndex=Math.min(n,Math.max(0,Z(t).length-1)),h(e,`\u5DF2\u653E\u5165\u52A0\u5BC6\u7BB1\uFF1A${o.name}`),k()),!0}function Gn(e){jt();const t=document.getElementById("realism-search-panel"),a=e.__realismSearch;if(!t)return;if(!a){t.classList.remove("is-visible");return}const n=Number(e.now||0),r=Math.max(.5,a.doneAt-a.startedAt),o=Math.max(0,Math.min(1,(n-a.startedAt)/r));o>=1&&(a.revealed=!0),t.classList.add("is-visible"),t.innerHTML=Tn(a,o)}function Zn(e,t){Kt(),Qn(e);const a=document.getElementById("realism-extract-panel"),n=e.arena?.group?.__realismExtractionZone;if(!a||!n)return;const r=Number(e.now||0),o=e.__realismExtraction||{};if(o.completed){ye(e,100,!0),a.classList.remove("is-visible"),document.body?.classList.add("realism-extracting"),r>=Number(o.returnAt||0)&&Vn(e);return}if(e.session?.screen!=="playing"){a.classList.remove("is-visible"),document.body?.classList.remove("realism-extracting"),e.__realismExtraction=null;return}const i=e.player?.getPosition?.()||e.camera?.position;if(!i)return;if(!(Math.hypot((i.x||0)-n.x,(i.z||0)-n.z)<=n.radius)){e.__realismExtraction=null,a.classList.remove("is-visible");return}const d=Number.isFinite(o.startedAt)?o.startedAt:r,c=Math.max(0,Math.min(1,(r-d)/5));e.__realismExtraction={startedAt:d,progress:c},a.classList.add("is-visible"),a.innerHTML=`
      <strong>\u6B63\u5728\u64A4\u79BB</strong>
      <span>\u7559\u5728\u7EFF\u8272\u70DF\u96FE\u5708\u5185 ${Math.ceil(Math.max(0,5-(r-d)))} \u79D2</span>
      <div class="realism-extract-track"><div class="realism-extract-fill" style="width:${Math.round(c*100)}%;"></div></div>
    `,c>=1&&jn(e,r)}function jn(e,t){e.__realismExtraction={completed:!0,returnAt:t+2.4},h(e,"\u64A4\u79BB\u6210\u529F"),document.body?.classList.add("realism-extracting"),document.exitPointerLock?.()}function Vn(e){e.__realismExtraction=null,document.body?.classList.remove("realism-extracting"),e.session={...e.session||{},screen:"menu",winner:null,playerAlive:!0,remainingTime:300,matchDuration:300},h(e,"\u5DF2\u64A4\u79BB\uFF0C\u7269\u8D44\u4FDD\u7559"),k(),se(e)}function Kn(e){Qt();const t=e.__realismRaidFailure;if(!t){document.body?.classList.remove("realism-raid-failed");return}const a=document.getElementById("realism-raid-fail-cinematic");if(a){const n=Number(t.lostCount||0);a.innerHTML=`<div class="realism-extract-card"><strong>\u64A4\u79BB\u5931\u8D25</strong><span>${n?`\u4E22\u5931 ${n} \u4EF6\u8EAB\u4E0A\u7269\u54C1\uFF1B\u4ED3\u5E93\u548C\u52A0\u5BC6\u7BB1\u7269\u54C1\u4FDD\u7559`:"\u4ED3\u5E93\u548C\u52A0\u5BC6\u7BB1\u7269\u54C1\u4FDD\u7559"}</span></div>`}document.body?.classList.add("realism-raid-failed"),!(Number(e.now||0)<Number(t.returnAt||0))&&(e.__realismRaidFailure=null,document.body?.classList.remove("realism-raid-failed"),se(e))}function Qn(e){const t=e.arena?.group?.__realismExtractionZone;if(!t?.smoke?.length)return;const a=Number(e.now||0);for(const n of t.smoke){const r=Number(n.userData?.phase||0),o=(Math.sin(a*1.8+r)+1)*.5;n.position.y=Number(n.userData?.baseY||.8)+o*.42,n.scale.setScalar(.85+o*.55),n.material&&(n.material.opacity=.12+o*.16)}}function Tt(e){const t=e?.session||{};if(Number.isFinite(t.remainingTime))return Math.max(0,Number(t.remainingTime));const a=Number(e?.now||0),n=Number.isFinite(t.startedAt)?t.startedAt:a;return Math.max(0,300-Math.max(0,a-n))}function Jn(e){const t=Math.ceil(Tt(e));return`${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`}function Tn(e,t){const a=!!e.revealed,n=Array.isArray(e.items)?e.items:[],r=new Set(e.claimedUids||[]),o=Math.max(9,Math.ceil(n.length/3)*3),i=n.filter(d=>d&&!r.has(d.uid)).length;a&&Ne(e);const s=Number.isFinite(e.selectedIndex)?e.selectedIndex:-1,l=Array.from({length:o},(d,c)=>er(n[c],a,r,c===s,c));return`
      <div class="realism-search-head">
        <span class="realism-search-glass"></span>
        <div>
          <strong>${y(e.label||"\u641C\u7D22\u7269\u8D44")}</strong>
          <span>${a?`\u53D1\u73B0 ${n.length} \u4EF6\u7269\u54C1\uFF0C\u5269\u4F59 ${i} \u4EF6\u53EF\u62FF\u53D6`:`\u6B63\u5728\u626B\u63CF\u7269\u8D44 ${Math.round(t*100)}%`}</span>
        </div>
        <span>${a?"M \u62FE\u53D6 / B \u52A0\u5BC6 / N \u5173\u95ED":"\u641C\u7D22\u4E2D"}</span>
      </div>
      <div class="realism-search-track"><div class="realism-search-fill" style="width:${Math.round(t*100)}%;"></div></div>
      <div class="realism-search-layout">
        <div class="realism-search-side">
          <strong>${y(e.container?.userData?.label||"\u5BB9\u5668")}</strong>
          <span>${a?"\u65B9\u5411\u952E\u5207\u6362\u767D\u5708\u9009\u4E2D\u7684\u7269\u54C1\uFF0C\u6309 M \u62FE\u53D6\uFF0C\u6309 B \u653E\u5165\u52A0\u5BC6\u7BB1\u3002":"\u653E\u5927\u955C\u5B8C\u6210\u626B\u63CF\u540E\uFF0C\u7269\u54C1\u4F1A\u5728\u53F3\u4FA7\u683C\u5B50\u91CC\u5C55\u5F00\u3002"}</span>
          <span>\u6309 L \u641C\u7D22\u9644\u8FD1\u5BB9\u5668</span>
          <span>\u6309 N \u5173\u95ED\u641C\u7D22\u754C\u9762</span>
        </div>
        <div>
          <div class="realism-search-grid">${l.join("")}</div>
          <div class="realism-search-actions">
            <button type="button" data-search-action="take-selected" ${a&&i?"":"disabled"}>\u62FE\u53D6\u9009\u4E2D (M)</button>
            <button type="button" data-search-action="take-all" ${a&&i?"":"disabled"}>\u5168\u90E8\u62FF\u53D6</button>
            <button type="button" data-search-action="close">\u5173\u95ED (N)</button>
          </div>
        </div>
      </div>
    `}function er(e,t,a,n,r){if(!e)return'<div class="realism-loot-slot is-empty"><span>\u7A7A\u683C</span><strong>\u65E0\u7269\u54C1</strong><span>\u6CA1\u6709\u53D1\u73B0</span><button type="button" disabled>\u7A7A</button></div>';const o=w(e.defId);if(!t)return'<div class="realism-loot-slot is-scanning"><span>\u626B\u63CF\u4E2D</span><strong>\u672A\u77E5\u7269\u54C1</strong><span><span class="realism-search-glass"></span>\u6B63\u5728\u8BC6\u522B</span><button type="button" disabled>\u7B49\u5F85</button></div>';const i=a.has(e.uid),s=o?.color?`style="border-color: ${o.color};"`:"";return`
      <div class="realism-loot-slot ${i?"is-taken":""} ${n&&!i?"is-selected":""}" data-search-index="${r}" ${s}>
        <span>${y(o?.meta||"\u53D8\u5356\u7269")}</span>
        <strong>${y(o?.name||"\u672A\u77E5\u7269\u54C1")}</strong>
        <span>\u4EF7\u503C ${V(o?.value||0)}</span>
        <button type="button" data-search-action="take-one" data-item-uid="${y(e.uid)}" ${i?"disabled":""}>${i?"\u5DF2\u62FF\u53D6":n?"M \u62FE\u53D6 / B \u52A0\u5BC6":"\u62FF\u53D6"}</button>
      </div>
    `}function tr(e,t){const a=e.target?.closest?.("button[data-search-action]");if(!a||!a.closest("#realism-search-panel"))return;e.preventDefault(),e.stopPropagation();const n=a.dataset.searchAction;n==="take-one"&&ea(t,a.dataset.itemUid),n==="take-selected"&&ta(t),n==="take-all"&&or(t),n==="close"&&aa(t)}function ar(e){if(!e?.session||e.session.screen!=="playing"){h(e,"\u8FDB\u5165\u5730\u56FE\u540E\u624D\u80FD\u641C\u7D22");return}if(e.__realismSearch){h(e,"\u6B63\u5728\u641C\u7D22\u4E2D");return}const t=dr(e);if(!t){h(e,"\u9760\u8FD1\u53EF\u641C\u7D22\u5BB9\u5668\u518D\u6309 L");return}if(t.userData?.searched){h(e,"\u8FD9\u4E2A\u5BB9\u5668\u5DF2\u7ECF\u641C\u7D22\u8FC7");return}if(t.userData?.searchCache){na(e,t);return}const a=ur(t),n=Math.max(.5,...a.map(r=>w(r.defId)?.scanTime||.5));e.__realismSearch={container:t,items:a,claimedUids:[],revealed:!1,selectedIndex:-1,label:`\u641C\u7D22 ${t.userData?.label||"\u5BB9\u5668"}`,startedAt:Number(e.now||0),doneAt:Number(e.now||0)+n},h(e,`\u6B63\u5728\u641C\u7D22 ${t.userData?.label||"\u5BB9\u5668"}`)}function ea(e,t){const a=e.__realismSearch;if(!a?.revealed||!t)return;const n=new Set(a.claimedUids||[]);if(n.has(t))return;const r=a.items?.find(l=>l.uid===t);if(!r)return;const o=(a.items||[]).findIndex(l=>l?.uid===t),i=x();if(bt(i)<=0){h(e,"\u80CC\u5305\u5DF2\u6EE1\uFF0C\u5148\u64A4\u79BB\u6216\u6E05\u7406\u53D8\u5356\u7269");return}i.inventory.push({...r,location:"backpack"}),A(i),n.add(t),a.claimedUids=[...n];const s=w(r.defId);h(e,`\u62FF\u53D6\uFF1A${s?.name||"\u7269\u8D44"}`),ra(a,o),Le(e),k()}function ta(e){const t=e.__realismSearch;if(!t)return;if(!t.revealed){h(e,"\u8FD8\u5728\u626B\u63CF\uFF0C\u7B49\u7269\u54C1\u663E\u793A\u540E\u518D\u6309 M");return}Ne(t);const a=Number.isFinite(t.selectedIndex)?t.selectedIndex:-1,n=a>=0?t.items?.[a]:null;if(!n){h(e,"\u6CA1\u6709\u53EF\u62FE\u53D6\u7269\u54C1");return}ea(e,n.uid)}function nr(e){const t=e.__realismSearch;if(!t)return!1;if(!t.revealed)return h(e,"\u8FD8\u5728\u626B\u63CF\uFF0C\u7B49\u7269\u54C1\u663E\u793A\u540E\u518D\u6309 B"),!0;Ne(t);const a=Number.isFinite(t.selectedIndex)?t.selectedIndex:-1,n=a>=0?t.items?.[a]:null;return n?rr(e,n.uid):(h(e,"\u6CA1\u6709\u53EF\u653E\u5165\u52A0\u5BC6\u7BB1\u7684\u7269\u54C1"),!0)}function rr(e,t){const a=e.__realismSearch;if(!a?.revealed||!t)return!1;const n=new Set(a.claimedUids||[]);if(n.has(t))return!0;const r=a.items?.find(d=>d.uid===t);if(!r)return!0;const o=x();if(o.secureContainer=Array.isArray(o.secureContainer)?o.secureContainer:[],o.secureContainer.length>=4)return h(e,"\u52A0\u5BC6\u7BB1\u5DF2\u6EE1"),!0;const i={...r,location:"secure"};o.inventory.push(i),o.secureContainer.push(i.uid),A(o),n.add(t),a.claimedUids=[...n];const s=w(r.defId),l=(a.items||[]).findIndex(d=>d?.uid===t);return ra(a,l),h(e,`\u5DF2\u653E\u5165\u52A0\u5BC6\u7BB1\uFF1A${s?.name||"\u7269\u8D44"}`),Le(e),k(),!0}function or(e){const t=e.__realismSearch;if(!t?.revealed)return;const a=new Set(t.claimedUids||[]),n=bt();if(n<=0){h(e,"\u80CC\u5305\u5DF2\u6EE1\uFF0C\u5148\u64A4\u79BB\u6216\u6E05\u7406\u53D8\u5356\u7269");return}const r=(t.items||[]).filter(l=>l&&!a.has(l.uid)).slice(0,n);if(!r.length){Le(e);return}const o=x();o.inventory.push(...r.map(l=>({...l,location:"backpack"}))),A(o);for(const l of r)a.add(l.uid);t.claimedUids=[...a];const i=r.map(l=>w(l.defId)?.name).filter(Boolean).join("\u3001"),s=(t.items||[]).filter(l=>l&&!a.has(l.uid)).length;h(e,s?`\u83B7\u5F97\uFF1A${i||"\u7269\u8D44"}\uFF0C\u80CC\u5305\u5DF2\u6EE1`:`\u83B7\u5F97\uFF1A${i||"\u7269\u8D44"}`),Le(e),k()}function Le(e){const t=e.__realismSearch;if(!t)return;const a=new Set(t.claimedUids||[]);(t.items||[]).every(r=>r&&a.has(r.uid))&&(t.container.userData.searched=!0,t.container.userData.searchCache=null,ia(t.container),e.__realismSearch=null,k())}function aa(e){const t=e.__realismSearch;if(!t)return;const a=new Set(t.claimedUids||[]),n=(t.items||[]).filter(r=>r&&!a.has(r.uid));n.length?(t.container.userData.searched=!1,t.container.userData.searchCache={items:t.items||[],claimedUids:[...a],revealed:!!t.revealed,label:t.label||`\u641C\u7D22 ${t.container.userData?.label||"\u5BB9\u5668"}`}):t.revealed&&(t.container.userData.searched=!0,t.container.userData.searchCache=null,ia(t.container)),e.__realismSearch=null,h(e,n.length?"\u5DF2\u5173\u95ED\uFF0C\u53EF\u9760\u8FD1\u6309 N \u91CD\u65B0\u6253\u5F00":"\u5DF2\u5173\u95ED\u641C\u7D22\u754C\u9762"),k()}function na(e,t){const a=t?.userData?.searchCache;if(!a?.items?.length)return!1;const n=Number(e.now||0),r=Math.max(.5,...a.items.map(o=>w(o.defId)?.scanTime||.5));return e.__realismSearch={container:t,items:a.items,claimedUids:a.claimedUids||[],revealed:!!a.revealed,selectedIndex:-1,label:a.label||`\u641C\u7D22 ${t.userData?.label||"\u5BB9\u5668"}`,startedAt:n,doneAt:n+(a.revealed?.5:r)},h(e,`\u91CD\u65B0\u6253\u5F00 ${t.userData?.label||"\u5BB9\u5668"}`),!0}function ir(e){if(!e?.session||e.session.screen!=="playing"){h(e,"\u8FDB\u5165\u5730\u56FE\u540E\u624D\u80FD\u91CD\u65B0\u6253\u5F00\u5BB9\u5668");return}const t=sr(e);if(!t){h(e,"\u9644\u8FD1\u6CA1\u6709\u53EF\u91CD\u5F00\u7684\u5BB9\u5668\uFF0C\u6309 L \u641C\u7D22\u65B0\u5BB9\u5668");return}na(e,t)}function sr(e){const t=e.player?.getPosition?.()||e.camera?.position,a=e.arena?.group?.__realismLootContainers||[];if(!t||!a.length)return null;let n=null,r=1/0;for(const o of a){if(o.userData?.searched||!o.userData?.searchCache)continue;const i=Math.hypot((t.x||0)-(o.position.x||0),(t.z||0)-(o.position.z||0));i<r&&(n=o,r=i)}return r<=8.25?n:null}function Ne(e){if(!e)return;const t=at(e);if(!t.length){e.selectedIndex=-1;return}t.includes(e.selectedIndex)||(e.selectedIndex=t[0])}function at(e){const t=new Set(e.claimedUids||[]);return(e.items||[]).map((a,n)=>a&&!t.has(a.uid)?n:-1).filter(a=>a>=0)}function ra(e,t=-1){const a=at(e);if(!a.length){e.selectedIndex=-1;return}e.selectedIndex=a.find(n=>n>t)??a[0]}function lr(e,t){const a=e.__realismSearch;if(!a?.revealed)return!1;const n=at(a);if(!n.length)return a.selectedIndex=-1,h(e,"\u6CA1\u6709\u53EF\u62FE\u53D6\u7269\u54C1"),!0;Ne(a);const r=Math.max(9,Math.ceil((a.items||[]).length/3)*3),o=3,i=t==="ArrowLeft"?-1:t==="ArrowRight"?1:t==="ArrowUp"?-o:o,s=Number.isFinite(a.selectedIndex)?a.selectedIndex:n[0],l=new Set(n);let d=s;for(let f=0;f<r;f+=1)if(d=(d+i+r)%r,l.has(d))return a.selectedIndex=d,oa(e,a),!0;const c=Math.max(0,n.indexOf(s)),u=t==="ArrowLeft"||t==="ArrowUp"?n[(c-1+n.length)%n.length]:n[(c+1)%n.length];return a.selectedIndex=u,oa(e,a),!0}function oa(e,t){const a=t.items?.[t.selectedIndex],n=w(a?.defId);n&&h(e,`\u9009\u4E2D\uFF1A${n.name}`)}function dr(e){const t=e.player?.getPosition?.()||e.camera?.position,a=e.arena?.group,n=a?.__realismLootContainers||[];if(!t||!n.length)return null;let r=null,o=1/0;for(const i of n){if(i.userData?.searched||i.userData?.kind==="damVault"&&!a?.__realismDamTunnelDoor?.userData?.open)continue;const s=Math.hypot((t.x||0)-(i.position.x||0),(t.z||0)-(i.position.z||0));s<o&&(r=i,o=s)}return o<=8.25?r:null}function cr(e){if(e?.session?.screen!=="playing"){e.__realismHeartRaidActive=!1;return}if(e.__realismHeartRaidActive)return;if(X().id!=="dam"){e.__realismHeartRaidActive=!0;return}const t=e.arena?.group?.__realismDamVault;if(!t)return;e.__realismHeartRaidActive=!0;const a=nt(),n=a>=19||Math.random()<.05,r=Re.find(o=>o.name==="\u975E\u6D32\u4E4B\u661F");t.userData.guaranteedDefId=n&&r?.id||"",t.userData.africaStarSpawned=n,e.__realismHeartSpawnedThisRaid=n,pr(n?0:Math.min(19,a+1))}function nt(){try{const e=Number(localStorage.getItem(It)||0);return Number.isFinite(e)?Math.max(0,Math.min(19,Math.floor(e))):0}catch{return 0}}function pr(e){try{localStorage.setItem(It,String(Math.max(0,Math.min(19,Math.floor(Number(e)||0)))))}catch{}}function ur(e){const t=3+Math.floor(Math.random()*4),a=[],n=e.userData?.guaranteedDefId?w(e.userData.guaranteedDefId):null;n&&a.push(lt(n));for(let r=a.length;r<t;r+=1){const o=fr(e.userData?.lootBias||0);a.push(lt(o))}return a}function fr(e=0){const t=Math.random()+e,a=t>.985?"red":t>.86?"gold":t>.58?"blue":t>.28?"green":"white",n=Re.filter(r=>r.tier===a&&!["\u975E\u6D32\u4E4B\u661F","\u975E\u6D32\u4E4B\u5FC3"].includes(r.name));return n[Math.floor(Math.random()*n.length)]||Re[0]}function ia(e){e.traverse?.(t=>{if(t.userData?.interactionOutline){t.visible=!1;return}t.isMesh&&t.material?.opacity!==void 0&&(t.material=t.material.clone?.()||t.material,t.material.transparent=!0,t.material.opacity=.42)})}function Be(e,t){if(!e||e.userData?.interactionOutlineMeshes||!t?.MeshBasicMaterial)return;const a=new t.MeshBasicMaterial({color:16777215,side:1,transparent:!0,opacity:.96,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1,fog:!1}),n=[],r=e.userData?.kind==="damVault";e.traverse?.(i=>{!i?.isMesh||i.userData?.interactionOutline||i.visible===!1||r&&i.name!=="dam-vault-pressure-case"||n.push(i)});const o=n.map(i=>{const s=new t.Mesh(i.geometry,a);return s.name="interaction-white-outline",s.userData.interactionOutline=!0,s.position.copy?.(i.position),s.rotation.copy?.(i.rotation),s.scale.copy?.(i.scale),s.scale.multiplyScalar?.(1.012),s.visible=!1,s.castShadow=!1,s.receiveShadow=!1,s.renderOrder=Math.max(0,Number(i.renderOrder||0)-1),i.parent?.add?.(s),s});e.userData.interactionOutlineMeshes=o,e.userData.interactionOutlineMaterial=a}function hr(e,t){for(const a of e?.userData?.interactionOutlineMeshes||[])a.visible=!!t}function mr(e){const t=e.player?.getPosition?.()||e.camera?.position;if(!t)return;const a=e.arena?.group,n=new Set([...a?.__realismLootContainers||[],...a?.__realismDoors||[],...a?.__realismManholes||[]]);for(const r of n){const o=r.userData?.interactX??r.position?.x??0,i=r.userData?.interactZ??r.position?.z??0,s=Math.hypot((t.x||0)-o,(t.z||0)-i),l=!r.userData?.searched&&r.userData?.disabled!==!0;hr(r,l&&s<=13)}}function br(e){e.__realismInventoryKeysInstalled||(e.__realismInventoryKeysInstalled=!0,window.addEventListener("keydown",t=>{if(t.repeat||uo(t))return;const a=t.key?.toLowerCase();if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(t.key)&&e.__realismSearch){lr(e,t.key),t.preventDefault(),t.stopPropagation();return}if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(t.key)&&e.__realismLoadoutOpen){Xn(e,t.key),t.preventDefault(),t.stopPropagation();return}if(a==="m"&&e.__realismSearch){ta(e),t.preventDefault(),t.stopPropagation();return}if(a==="b"&&e.__realismSearch){nr(e),t.preventDefault(),t.stopPropagation();return}if(a==="m"&&e.__realismLoadoutOpen){Un(e),t.preventDefault(),t.stopPropagation();return}if(a==="b"&&e.__realismLoadoutOpen){Yn(e),t.preventDefault(),t.stopPropagation();return}if(a==="n"&&e.__realismSearch){aa(e),t.preventDefault(),t.stopPropagation();return}if((a==="v"||a==="n"||t.key==="Escape")&&e.__realismLoadoutOpen){e.__realismLoadoutOpen=!1,t.preventDefault(),t.stopPropagation();return}if(a==="v"){Wn(e),t.preventDefault(),t.stopPropagation();return}if(a==="n"){ir(e),t.preventDefault(),t.stopPropagation();return}if(a==="q"&&(ba(e),t.preventDefault()),a==="x"&&(ga(e),t.preventDefault()),a==="g"){sa(e,"grenade"),t.preventDefault(),t.stopPropagation();return}if(a==="h"){sa(e,"flash"),t.preventDefault(),t.stopPropagation();return}a==="l"&&(ar(e),t.preventDefault())}))}function sa(e,t){const a=window.__FPS_THREE__;if(!e?.camera||!a?.Vector3||e.session?.screen!=="playing"){h(e,"\u8FDB\u5C40\u540E\u624D\u80FD\u6295\u63B7\u6218\u672F\u9053\u5177");return}const n=x(),r=gr(n,t);if(r<0){h(e,t==="grenade"?"\u4ED3\u5E93\u91CC\u6CA1\u6709\u53EF\u7528\u624B\u96F7":"\u4ED3\u5E93\u91CC\u6CA1\u6709\u53EF\u7528\u95EA\u5149\u5F39");return}const o=n.inventory[r],i=w(o.defId);n.inventory.splice(r,1),A(n),k(),xr(e,a,i),h(e,t==="grenade"?"\u5DF2\u6295\u63B7\u7834\u7247\u624B\u96F7":"\u5DF2\u6295\u63B7\u95EA\u5149\u5F39")}function gr(e,t){return(e.inventory||[]).findIndex(a=>{if(j(e,a.uid))return!1;const n=w(a.defId);return n?.type==="tactical"&&n.effect===t})}function xr(e,t,a){const n=e.__realismMats,r=new t.Vector3,o=new t.Vector3;e.camera.getWorldPosition(r),e.camera.getWorldDirection(o),r.addScaledVector(o,.82),r.y-=.16;const i=a.effect==="flash"?n.flashWhite:n.fragMetal,s=b(e.scene,t,r.x,r.y,r.z,a.effect==="flash"?.115:.13,a.effect==="flash"?.3:.34,i,a.effect==="flash"?"thrown-flashbang":"thrown-frag-grenade","z"),l=o.clone().multiplyScalar(a.effect==="flash"?16:15.5);l.y+=a.effect==="flash"?3.2:3.6,e.__realismTacticalProjectiles=e.__realismTacticalProjectiles||[],e.__realismTacticalProjectiles.push({type:a.effect,defId:a.id,mesh:s,velocity:l,radius:a.radius||5,damage:a.damage||0,duration:a.duration||3,fuse:a.effect==="flash"?1.15:1.75,thrownAt:performance.now()/1e3,bounced:!1})}function yr(e,t){const a=e.__realismTacticalProjectiles||[];if(!a.length)return;const n=performance.now()/1e3,r=Number(e.__realismTacticalLastAt||n),o=Math.max(.001,Math.min(.05,n-r||.016));e.__realismTacticalLastAt=n;const i=[];for(const s of a){if(!s.mesh?.parent)continue;s.velocity.y-=9.4*o,s.mesh.position.addScaledVector(s.velocity,o),s.mesh.rotation.x+=o*8.5,s.mesh.rotation.z+=o*5.8;const l=s.type==="flash"?_r(e,s.mesh.position):null;if(l){la(e,t,s,l);continue}const d=wr(e.arena,s.mesh.position),c=s.mesh.position.y<=.14;if(c&&!s.bounced&&performance.now()/1e3-s.thrownAt<s.fuse-.2&&(s.mesh.position.y=.14,s.velocity.y=Math.abs(s.velocity.y)*.34,s.velocity.x*=.68,s.velocity.z*=.68,s.bounced=!0),n-s.thrownAt>=s.fuse||d||c&&s.bounced&&Math.abs(s.velocity.y)<.65){s.type==="grenade"?vr(e,t,s):la(e,t,s,null);continue}i.push(s)}e.__realismTacticalProjectiles=i}function wr(e,t){return e?.colliders?e.colliders.some(a=>t.x>=a.minX&&t.x<=a.maxX&&t.z>=a.minZ&&t.z<=a.maxZ&&t.y>=a.minY+.1&&t.y<=a.maxY-.05):!1}function vr(e,t,a){const n=a.mesh.position.clone();da(a),ca(e,t,n,a.radius,"grenade"),Sr(e,t,n,a.radius),Mr(e,n,a.radius,a.damage||34)}function la(e,t,a,n){const r=a.mesh.position.clone();da(a),ca(e,t,r,a.radius,"flash");const o=a.duration||3;n&&(n.enemy={...n.enemy,hitFlash:1,state:"flashed"},n.__realismFlashUntil=Number(e.now||0)+o,n.view?.sync?.(n.enemy,e.player?.getPosition?.()),(n.isLanRemote||n.enemy?.isHuman)&&Pr(e,n.enemy?.id,r,o),h(e,"\u95EA\u5149\u5F39\u547D\u4E2D\u5BF9\u624B"));const i=ot(e,window.__FPS_THREE__);i&&Se(i,r)<=a.radius*.72&&(Ot(e,o),h(e,"\u4F60\u88AB\u95EA\u5149\u5F39\u5F71\u54CD"))}function da(e){const t=e?.mesh;t&&(t.parent?.remove(t),t.geometry?.dispose?.())}function ca(e,t,a,n,r){if(!e?.scene)return;const o=e.__realismMats;if(r==="grenade"&&typeof e.createExplosionEffect=="function")try{e.createExplosionEffect(a,Math.min(n,7))}catch{}const i=z(e.scene,t,a.x,Math.max(.2,a.y),a.z,r==="flash"?.42:.34,r==="flash"?o.flashWhite:o.blastGlow,r==="flash"?"flashbang-burst":"grenade-burst");if(i.scale.setScalar(r==="flash"?1.8:1.2),setTimeout(()=>{i.parent?.remove(i),i.geometry?.dispose?.()},r==="flash"?520:460),r==="grenade")for(let s=0;s<8;s+=1){const l=s/8*Math.PI*2,d=z(e.scene,t,a.x+Math.cos(l)*.8,.2,a.z+Math.sin(l)*.8,.18+Math.random()*.16,o.dustCloud,"blast-dust-cloud");d.scale.set(1.8,.55,1.8),setTimeout(()=>{d.parent?.remove(d),d.geometry?.dispose?.()},900+s*35)}}function _r(e,t){const a=e.session?.playerTeam||e.lanClient?.team||"blue";let n=null,r=1/0;for(const o of e.enemyRecords||[]){const i=o.enemy;if(!i||i.dead||i.team===a)continue;const s=ha(o);if(!s)continue;const l=Se({x:t.x,y:t.y,z:t.z},{x:s.x,y:s.y+1,z:s.z});l<r&&(n=o,r=l)}return r<=1.25?n:null}function Mr(e,t,a,n){const r=ot(e,window.__FPS_THREE__);if(r){const i=Se(r,t);if(i<=a*.88){const s=Math.max(4,n*(1-i/a)*.72);Xt(e,s,"\u7206\u70B8\u51B2\u51FB")}}const o=e.session?.playerTeam||e.lanClient?.team||"blue";for(const i of e.enemyRecords||[]){if(i.isLanRemote||i.enemy?.dead||i.enemy?.team===o)continue;const s=ha(i);if(!s)continue;const l={x:s.x,y:s.y+.9,z:s.z},d=Se(l,t);if(d>a)continue;const c=Math.max(6,n*(1-d/a));Ta(e,i,c,"\u624B\u96F7\u7206\u70B8")}}function Sr(e,t,a,n){const o=e.arena?.group;if(!o)return;const i=[];o.traverse(l=>{if(!l.isMesh||l.__realismDestroyed||!kr(l))return;const d=fa(l),c=l.position,u=Math.hypot(c.x-a.x,c.z-a.z)+Math.max(0,Math.abs(c.y-a.y)-d.y*.45)*.35;u<=n+Math.max(d.x,d.z)*.22&&i.push({mesh:l,distance:u})}),i.sort((l,d)=>l.distance-d.distance);for(const l of i.slice(0,18))Cr(e,t,l.mesh,a);const s=o.__realismDestructibleBuildings||[];for(const l of s){const d=Math.hypot(l.x-a.x,l.z-a.z);d<=n+2.2&&a.y<=2.4&&(l.baseHits+=d<4.5?2:1),!l.collapsed&&l.baseHits>=2&&Ar(e,t,l,a)}}function kr(e){const t=String(e.name||"");return t.includes("interactive-shop-door")?!0:(t.includes("street-shop")||t.includes("shop-entry-inner-wall")||t.includes("shop-shelf-frame")||t.includes("shop-counter"))&&!t.includes("interior-floor")}function Cr(e,t,a,n){if(!a?.parent||a.__realismDestroyed)return;a.__realismDestroyed=!0;const r=a.position.clone?a.position.clone():new t.Vector3(a.position.x||0,a.position.y||0,a.position.z||0),o=fa(a),i=r.y<=2.15||/column|sill|back-wall|side-wall|inner-wall|counter/.test(a.name||""),s=zr(e.arena?.group,r.x,r.z);s&&i&&(s.baseHits+=1),pa(e,t,r,i?16:10,Math.max(.2,Math.min(.9,Math.max(o.x,o.z)/5)),n),ua(e.arena,r.x,r.z,Math.max(1.2,Math.min(4.2,Math.max(o.x,o.z)*.55))),e.arena.meshes=(e.arena.meshes||[]).filter(l=>l!==a),a.parent.remove(a),a.geometry?.dispose?.()}function Ar(e,t,a,n){if(!a||a.collapsed)return;a.collapsed=!0;const r=e.arena?.group;if(!r)return;const o=[];r.traverse(i=>{if(!i.isMesh||i.__realismDestroyed)return;const s=String(i.name||"");if(!Dr(s))return;Math.hypot((i.position?.x||0)-a.x,(i.position?.z||0)-a.z)<=6.4&&o.push(i)});for(const i of o){i.__realismDestroyed=!0;const s=i.position.clone?i.position.clone():new t.Vector3(i.position.x||0,i.position.y||0,i.position.z||0);pa(e,t,s,14,.75,n||s,!0),e.arena.meshes=(e.arena.meshes||[]).filter(l=>l!==i),i.parent?.remove(i),i.geometry?.dispose?.()}ua(e.arena,a.x,a.z,6.8),h(e,"\u623F\u5C4B\u4E0B\u90E8\u88AB\u70B8\u6BC1\uFF0C\u4E0A\u90E8\u7ED3\u6784\u574D\u584C")}function Dr(e){return/roof|ceiling|upper-wall|awning|sign|window|frame|lit-panel|shelf-goods|doorway|door-frame/.test(e)}function pa(e,t,a,n,r=.5,o=a,i=!1){if(!e?.scene)return;const s=e.__realismMats;e.__realismFallingDebris=e.__realismFallingDebris||[];for(let l=0;l<n;l+=1){const d=(.16+Math.random()*.34)*r,c=(.12+Math.random()*.24)*r,u=(.18+Math.random()*.36)*r,f=a.x+(Math.random()-.5)*(i?2.4:1.4),g=Math.max(.35,a.y+(Math.random()-.35)*1.2),M=a.z+(Math.random()-.5)*(i?2.4:1.4),D=Math.random()>.22?s.brick:s.concrete,m=p(e.scene,t,f,g,M,d,c,u,D,"falling-brick-debris"),E=f-(o?.x||a.x),R=M-(o?.z||a.z),$=Math.hypot(E,R)||1,B=i?1.4:3.4,P=new t.Vector3(E/$*B+(Math.random()-.5)*2.2,i?-.8-Math.random()*1.8:2.2+Math.random()*4.2,R/$*B+(Math.random()-.5)*2.2);e.__realismFallingDebris.push({mesh:m,velocity:P,spin:new t.Vector3(Math.random()*5,Math.random()*5,Math.random()*5),life:i?6.5:5.2,damage:i?12:7,damageDone:!1})}}function Ir(e,t){const a=e.__realismFallingDebris||[];if(!a.length)return;const n=performance.now()/1e3,r=Number(e.__realismDebrisLastAt||n),o=Math.max(.001,Math.min(.05,n-r||.016));e.__realismDebrisLastAt=n;const i=ot(e,t),s=[];for(const l of a){const d=l.mesh;d?.parent&&(l.life-=o,l.velocity.y-=9.6*o,d.position.addScaledVector(l.velocity,o),d.rotation.x+=l.spin.x*o,d.rotation.y+=l.spin.y*o,d.rotation.z+=l.spin.z*o,d.position.y<=.08&&(d.position.y=.08,l.velocity.y=Math.abs(l.velocity.y)*.16,l.velocity.x*=.52,l.velocity.z*=.52,l.spin.multiplyScalar(.72)),!l.damageDone&&i&&Se(i,d.position)<=.82&&Math.abs(l.velocity.y)>1.15&&(l.damageDone=!0,Xt(e,l.damage,"\u5760\u843D\u7816\u5757")),l.life>0?s.push(l):(d.parent.remove(d),d.geometry?.dispose?.()))}e.__realismFallingDebris=s}function Er(e,t){const a=e?.arena?.group?.__realismBridgeRiver;if(X().id!=="bridge"||!a||e.session?.screen!=="playing"||e.session?.playerAlive===!1){rt(e);return}const n=e?.player?.getPosition?.()||e?.camera?.position;if(!n)return;const r=n.x>=a.minX&&n.x<=a.maxX&&n.z>=a.minZ&&n.z<=a.maxZ,o=Math.abs(n.x||0)<=(a.safeBridgeHalfWidth||2.55)||(n.y||0)>.58;if(!(r&&!o)){e.__realismBridgeWaterStartedAt&&h(e,"\u5DF2\u79BB\u5F00\u6CB3\u6C34"),rt(e);return}const s=Number(e.now||Date.now()/1e3),l=Number(a.deathSeconds||10);if(!e.__realismBridgeWaterStartedAt){e.__realismBridgeWaterStartedAt=s,e.__realismBridgeWaterLastSecond=l,h(e,`\u843D\u5165\u6CB3\u4E2D\uFF1A${l} \u79D2\u540E\u6B7B\u4EA1`);return}const d=Math.max(0,l-(s-e.__realismBridgeWaterStartedAt)),c=Math.ceil(d);c!==e.__realismBridgeWaterLastSecond&&(e.__realismBridgeWaterLastSecond=c,h(e,c>0?`\u843D\u5165\u6CB3\u4E2D\uFF1A${c} \u79D2\u540E\u6B7B\u4EA1`:"\u843D\u6C34\u6B7B\u4EA1")),d<=0&&(rt(e),Qe(e,s))}function rt(e){e&&(e.__realismBridgeWaterStartedAt=0,e.__realismBridgeWaterLastSecond=0)}function Rr(e){const t=e?.arena?.group?.__realismBridgeRiver;if(!t||!e.__realismBridgeWaterStartedAt)return 0;const a=Number(e.now||Date.now()/1e3);return Math.max(0,Math.ceil(Number(t.deathSeconds||10)-(a-e.__realismBridgeWaterStartedAt)))}function ua(e,t,a,n){e?.colliders&&(e.colliders=e.colliders.filter(r=>{if(!/street-shop|shop-|door|window/.test(String(r.name||"")))return!0;const o=(r.minX+r.maxX)/2,i=(r.minZ+r.maxZ)/2;return Math.hypot(o-t,i-a)>n}))}function zr(e,t,a){let n=null,r=1/0;for(const o of e?.__realismDestructibleBuildings||[]){const i=Math.hypot(o.x-t,o.z-a);i<r&&(n=o,r=i)}return r<=6.6?n:null}function fa(e){const t=e.geometry?.parameters||{};return{x:Math.max(.1,(t.width||t.radiusTop*2||t.radius*2||.4)*(e.scale?.x||1)),y:Math.max(.1,(t.height||.4)*(e.scale?.y||1)),z:Math.max(.1,(t.depth||t.radiusTop*2||t.radius*2||.4)*(e.scale?.z||1))}}function ot(e,t){const a=e?.player?.getPosition?.()||e?.camera?.position;return a?new t.Vector3(a.x||0,(a.y||0)+.95,a.z||0):null}function ha(e){return e?.enemy?.position||e?.view?.root?.position||null}function Se(e,t){return Math.hypot((e.x||0)-(t.x||0),(e.y||0)-(t.y||0),(e.z||0)-(t.z||0))}function Pr(e,t,a,n=3){if(!t||e.selectedMode!=="lan"||!e.lanClient?.joined)return;const r=e.__realismLanRoomId||e.lanClient.roomId||"delta-lan",o=e.lanClient.playerId;fetch("/api/lan/flash",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({roomId:r,playerId:o,targetId:t,duration:n,origin:{x:a.x||0,y:a.y||0,z:a.z||0}})}).catch(()=>h(e,"\u95EA\u5149\u5F39\u540C\u6B65\u5931\u8D25"))}function $r(e){if(!e||e.__realismLanFlashEventsPatched||typeof e.applyLanEvents!="function")return;const t=e.applyLanEvents.bind(e);e.applyLanEvents=(a=[])=>{for(const n of a||[]){if(n?.type!=="flash")continue;n.targetId===e.lanClient?.playerId&&(Ot(e,n.duration||3),h(e,"\u88AB\u95EA\u5149\u5F39\u547D\u4E2D\uFF0C\u767D\u5C4F 3 \u79D2"));const r=n.playerId?(e.enemyRecords||[]).find(o=>o.enemy?.id===n.playerId):null;r&&(r.enemy={...r.enemy,firingFlash:1})}return t(a)},e.__realismLanFlashEventsPatched=!0}function ma(e){const t=x(),a=it(t);if(e.roleState){const n=e.roleState.shieldActive?.62:1;a>0?(e.roleState.speedMultiplier=Math.round(n*1.2*100)/100,e.__realismSwiftBoostActive=!0):e.__realismSwiftBoostActive&&(e.roleState.speedMultiplier=n,e.__realismSwiftBoostActive=!1)}a<=0&&t.active?.swiftUntilMs&&(t.active.swiftUntilMs=0,A(t),k())}function Lr(e){if(!e?.weapon||e.session?.screen!=="playing"){e.__realismAmmoWatch=null;return}const t=Number(e.weapon.ammo||0),a=`${e.weapon.type||""}:${e.weapon.label||""}`,n=e.__realismAmmoWatch;if(n&&n.weaponKey===a&&!e.weapon.reloading&&t<n.ammo){const r=Math.max(0,Math.round(n.ammo-t));Br(e,r),Or(e,r)}e.__realismAmmoWatch={weaponKey:a,ammo:t}}function Nr(e){if(!e?.weapon)return;const t=Fe(),a=Hr(e.weapon.type,e.weapon.spread);e.weapon.spread=Math.round(a*t.spreadMultiplier*1e4)/1e4,e.weapon.__realismHandling=t}function Br(e,t=1){if(!e?.camera||e.session?.screen!=="playing")return;const a=Fe(),n=Math.max(1,Math.min(3,t)),r=a.recoilKick*n;e.camera.rotation.x=ce((e.camera.rotation.x||0)-r,-1.45,1.45),e.camera.rotation.z+=Math.sin((e.now||Date.now())*19.7)*a.sideKick*n}function Hr(e,t=.028){return e==="rifle"?.018:e==="marksman"?.008:e==="assault"?.028:Number.isFinite(t)?t:.028}function Or(e,t){if(!t)return;const a=x(),n=le(a);if(!n)return;const r=w(n.defId),o=te(a);if(r?.ammoClass==="aw"&&o?.id!=="gun-awm"){a.equipped.ammo="",A(a),k();return}n.remaining=Math.max(0,F((Number(n.remaining)||0)-t)),n.remaining<=0&&(a.inventory=a.inventory.filter(i=>i.uid!==n.uid),a.equipped.ammo="",h(e,`${r?.name||"\u5B50\u5F39"} \u5DF2\u7528\u5B8C`)),A(a),k()}function Fr(e,t){const n=x().inventory.find(o=>o.uid===e),r=w(n?.defId);!n||!r||r.type!=="medicine"||(r.effect==="heal"&&ba(t,e),r.effect==="swift"&&ga(t,e))}function ba(e,t=""){if(!e?.session||e.session.screen!=="playing"){h(e,"\u8FDB\u5165\u6218\u6597\u540E\u624D\u80FD\u4F7F\u7528\u8840\u91CF\u6062\u590D\u5242");return}if(e.__realismPlayerRespawnAt||e.session.playerAlive===!1){h(e,"\u5012\u5730\u4E2D\uFF0C\u7B49\u5F85\u590D\u6D3B");return}const a=x(),n=xa(a,"heal",t);if(n<0){h(e,"\u4ED3\u5E93\u91CC\u6CA1\u6709\u8840\u91CF\u6062\u590D\u5242");return}const r=a.inventory[n],o=Number.isFinite(r.remaining)?r.remaining:60,i=He(e),s=F(100-i);if(s<=0){h(e,"\u8840\u91CF\u5DF2\u6EE1");return}const l=F(Math.min(s,o)),d=F(Math.min(100,i+l));r.remaining=F(o-l),r.remaining<=.05&&a.inventory.splice(n,1),A(a),e.__realismPlayerDamageState||(e.__realismPlayerDamageState={health:d,nativeHealth:d,damageFlash:0}),e.__realismPlayerDamageState.health=d,e.__realismPlayerDamageState.nativeHealth=d,ye(e,d,!0),h(e,`\u8840\u91CF\u6062\u590D ${l}`),k()}function ga(e,t=""){if(!e?.session||e.session.screen!=="playing"){h(e,"\u8FDB\u5165\u6218\u6597\u540E\u624D\u80FD\u4F7F\u7528\u8FC5\u6377\u836F\u5242");return}const a=x(),n=xa(a,"swift",t);if(n<0){h(e,"\u4ED3\u5E93\u91CC\u6CA1\u6709\u8FC5\u6377\u836F\u5242");return}a.inventory.splice(n,1),a.active={...a.active||{},swiftUntilMs:Date.now()+1e4},A(a),ma(e),h(e,"\u8FC5\u6377\u836F\u5242\u751F\u6548\uFF1A\u901F\u5EA6\u63D0\u5347 20%"),k()}function xa(e,t,a=""){if(a){const n=e.inventory.findIndex(r=>!j(e,r.uid)&&r.uid===a&&w(r.defId)?.effect===t);if(n>=0)return n}return e.inventory.findIndex(n=>!j(e,n.uid)&&w(n.defId)?.effect===t)}function it(e=x()){const t=Number(e.active?.swiftUntilMs||0);return Math.max(0,(t-Date.now())/1e3)}function ya(e){return(e.inventory||[]).reduce((t,a)=>{const n=w(a.defId);return j(e,a.uid)||n?.effect!=="heal"?t:t+(Number.isFinite(a.remaining)?a.remaining:n.healPool||60)},0)}function He(e){const t=e.__realismPlayerDamageState?.health;return Q(Number.isFinite(t)?t:e.session?.health,100)}function qr(e,t){const a=w(e);if(!a)return;const n=x();if(n.coins<a.cost){h(t,"\u6E38\u620F\u5E01\u4E0D\u8DB3");return}n.coins-=a.cost,n.inventory.push(lt(a)),n.selectedTab="warehouse",A(n);const r=document.getElementById("realism-delta-ui");r&&(r.dataset.tab="warehouse"),h(t,`\u5DF2\u8D2D\u4E70 ${a.name}\uFF0C\u5DF2\u653E\u5165\u4ED3\u5E93`),k()}function Wr(e,t){const a=xe.find(r=>r.id===e);if(!a)return;const n=x();n.equipped={...n.equipped||{},operator:a.id},A(n),st(n),h(t,`\u5DF2\u9009\u62E9\u5E72\u5458\uFF1A${a.name}`),k()}function Xr(e,t){const a=ue.find(r=>r.id===e)||ue[0],n=x();n.selectedMap=a.id,A(n),t&&(t.__realismSelectedMap=a.id),h(t,`\u5DF2\u9009\u62E9\u5730\u56FE\uFF1A${a.name}`),k()}function Ur(e,t){const a=Ae(e),n=x();n.deployMode=a,a==="multi"&&!n.multiplayerRole&&(n.multiplayerRole="host"),A(n),t&&(t.selectedMode=a==="multi"?"lan":"team"),h(t,a==="multi"?"\u5DF2\u9009\u62E9\u591A\u4EBA\u6E38\u620F":"\u5DF2\u9009\u62E9\u5355\u4EBA\u7A81\u88AD"),k()}function Yr(e,t){const a=We(e),n=x();n.deployMode="multi",n.multiplayerRole=a,A(n),h(t,a==="host"?"\u5DF2\u9009\u62E9\u623F\u4E3B":"\u5DF2\u9009\u62E9\u623F\u5BA2"),k()}function Gr(e){const t=x();t.deployMode="multi",t.multiplayerRole="host",t.multiplayerInviteCode=Da(),t.guestInviteCode=t.multiplayerInviteCode,A(t),wt(e,t),h(e,`\u623F\u95F4\u5DF2\u521B\u5EFA\uFF1A${t.multiplayerInviteCode}`),k()}function Zr(e){const t=document.getElementById("delta-invite-input"),a=J(t?.value||"");if(!a){h(e,"\u5148\u8F93\u5165\u623F\u4E3B\u7684\u9080\u8BF7\u7801");return}const n=x();n.deployMode="multi",n.multiplayerRole="guest",n.guestInviteCode=a,A(n),wt(e,n),st(n),qe(e,!0),wa(e,"multi")}function jr(e,t){if(t.deployMode="multi",t.multiplayerRole=We(t.multiplayerRole||"host"),t.multiplayerRole==="host")t.multiplayerInviteCode=J(t.multiplayerInviteCode)||Da(),t.guestInviteCode=t.multiplayerInviteCode;else{const a=J(document.getElementById("delta-invite-input")?.value||"");if(t.guestInviteCode=a||J(t.guestInviteCode),!t.guestInviteCode)return A(t),h(e,"\u623F\u5BA2\u9700\u8981\u5148\u8F93\u5165\u9080\u8BF7\u7801"),k(),!1}return A(t),wt(e,t),!0}function Vr(e,t){const a=x();if(a.pendingSale?.uid){h(t,"\u4EA4\u6613\u884C\u6B63\u5728\u4F30\u4EF7\u4E0A\u4E00\u4EF6\u7269\u54C1");return}const n=a.inventory.find(i=>i.uid===e),r=w(n?.defId);if(!n||r?.type!=="loot")return;const o=Math.max(.5,Number(r.scanTime||.5));a.pendingSale={uid:e,defId:r.id,startedAtMs:Date.now(),untilMs:Date.now()+o*1e3},A(a),h(t,`\u4EA4\u6613\u884C\u6B63\u5728\u9274\u5B9A\uFF1A${r.name}`),k()}function Kr(e){const t=x(),a=t.pendingSale;if(!a?.uid||Date.now()<Number(a.untilMs||0))return;const n=t.inventory.find(o=>o.uid===a.uid),r=w(n?.defId||a.defId);n&&r?.type==="loot"&&(t.inventory=t.inventory.filter(o=>o.uid!==a.uid),t.coins=Math.max(0,Math.round((t.coins||0)+(r.value||0))),h(e,`\u5DF2\u51FA\u552E ${r.name}\uFF0C\u83B7\u5F97 ${V(r.value)} \u6E38\u620F\u5E01`)),t.pendingSale=null,A(t),k()}function Qr(e,t){const a=x(),n=a.inventory.find(i=>i.uid===e),r=w(n?.defId),o=Ca(r);if(!(!n||!o)){if(mt(a,e)){h(t,"\u5148\u5378\u4E0B\u518D\u51FA\u552E");return}a.inventory=a.inventory.filter(i=>i.uid!==e),a.coins=Math.max(0,Math.round((a.coins||0)+o)),A(a),h(t,`\u5DF2\u51FA\u552E ${r.name}\uFF0C\u83B7\u5F97 ${V(o)} \u6E38\u620F\u5E01`),k()}}function Jr(e,t){const a=x(),n=a.inventory.find(o=>o.uid===e),r=w(n?.defId);if(!(!n||r?.type!=="tactical")){if(j(a,e)){h(t,"\u5148\u4ECE\u52A0\u5BC6\u7BB1\u79FB\u51FA\u518D\u5E26\u5165");return}n.location="carried",A(a),h(t,`${r.name} \u5DF2\u653E\u5165\u968F\u8EAB\u680F\uFF0C\u6218\u6597\u4E2D\u6309 ${r.effect==="grenade"?"G":"H"} \u4F7F\u7528`),k()}}function Tr(e,t){const a=x(),n=a.inventory.find(o=>o.uid===e),r=w(n?.defId);if(!(!n||!r)){if(mt(a,e)){h(t,"\u5DF2\u88C5\u5907\u7684\u7269\u54C1\u4E0D\u80FD\u653E\u8FDB\u52A0\u5BC6\u7BB1");return}if(a.secureContainer=Array.isArray(a.secureContainer)?a.secureContainer:[],!a.secureContainer.includes(e)){if(a.secureContainer.length>=4){h(t,"\u52A0\u5BC6\u7BB1\u5DF2\u6EE1");return}a.secureContainer.push(e),n.location="secure",A(a),h(t,`\u5DF2\u653E\u5165\u52A0\u5BC6\u7BB1\uFF1A${r.name}`),k()}}}function eo(e,t){const a=x(),n=a.inventory.find(o=>o.uid===e),r=w(n?.defId);if(!(!n||!r)){if(r.type==="loot"&&bt(a)<=0){h(t,"\u80CC\u5305\u5DF2\u6EE1\uFF0C\u4E0D\u80FD\u79FB\u51FA\u53D8\u5356\u7269");return}a.secureContainer=(a.secureContainer||[]).filter(o=>o!==e),r.type==="loot"?n.location="backpack":delete n.location,A(a),h(t,`\u5DF2\u79FB\u51FA\u52A0\u5BC6\u7BB1\uFF1A${r.name}`),k()}}function to(e,t){const a=x(),n=a.inventory.find(o=>o.uid===e),r=w(n?.defId);if(!(!n||!r)){if(j(a,e)){h(t,"\u5148\u4ECE\u52A0\u5BC6\u7BB1\u79FB\u51FA\u518D\u88C5\u5907");return}if(a.equipped={...a.equipped||{}},r.type==="weapon"){a.equipped.weapon=e,ht(a),A(a),qe(t,!0),h(t,`\u5DF2\u88C5\u5907 ${r.name}`),k();return}if(r.type==="ammo"){const o=W(a,"weapon");if(r.ammoClass==="aw"&&o?.id!=="gun-awm"){h(t,"AWM \u4E13\u7528\u5B50\u5F39\u53EA\u80FD\u7ED9 AWM \u4F7F\u7528");return}a.equipped.ammo=e,A(a),h(t,`\u5DF2\u88C5\u5907 ${r.name}`),k();return}if(["chestRig","helmet","armor","backpack"].includes(r.type)&&(a.equipped[r.slot||r.type]=e),r.type==="attachment"){if(r.sniperOnly&&!ut(a)){h(t,"\u56DB\u500D\u7784\u51C6\u955C\u53EA\u80FD\u88C5\u5728\u72D9\u51FB\u67AA\u4E0A");return}const o=new Set(a.equipped.attachments||[]);for(const i of a.inventory){const s=w(i.defId);s?.type==="attachment"&&s.slot===r.slot&&o.delete(i.uid)}o.add(e),a.equipped.attachments=[...o]}A(a),h(t,`\u5DF2\u88C5\u5907 ${r.name}`),k()}}function ao(e,t){const a=x(),n=a.inventory.find(o=>o.uid===e),r=w(n?.defId);!n||!r||(a.equipped={...a.equipped||{}},a.equipped.weapon===e&&(a.equipped.weapon=""),a.equipped.ammo===e&&(a.equipped.ammo=""),a.equipped.chestRig===e&&(a.equipped.chestRig=""),a.equipped.helmet===e&&(a.equipped.helmet=""),a.equipped.armor===e&&(a.equipped.armor=""),a.equipped.backpack===e&&(a.equipped.backpack=""),Array.isArray(a.equipped.attachments)&&(a.equipped.attachments=a.equipped.attachments.filter(o=>o!==e)),ht(a),A(a),h(t,`\u5DF2\u5378\u4E0B ${r.name}`),k())}function wa(e,t="raid"){const a=Ae(t)==="multi"?"lan":"team";e&&(e.selectedMode=a,e.lanClient=e.lanClient||{},e.lanClient&&a!=="lan"&&(e.lanClient.joined=!1));const r=[...document.querySelectorAll("button")].filter(o=>!o.closest("#realism-delta-ui")).find(o=>/开始|部署|进入/.test(o.textContent||""))||document.querySelector(".start-button");if(r){r.click();return}h(e,"\u6CA1\u6709\u627E\u5230\u539F\u6765\u7684\u5F00\u59CB\u6309\u94AE")}function st(e){const t=dt(e);[...document.querySelectorAll(".role-card, button")].filter(r=>!r.closest("#realism-delta-ui")).find(r=>(r.textContent||"").includes(t.name))?.click?.()}function x(){const e=va();try{const t=JSON.parse(localStorage.getItem(Dt)||"null");return!t||typeof t!="object"?e:_a({...e,...t})}catch{return e}}function A(e){try{localStorage.setItem(Dt,JSON.stringify(_a(e)))}catch{}}function va(){return{coins:1e5,inventory:[],equipped:{operator:"weicong",weapon:"",ammo:"",chestRig:"",helmet:"",armor:"",backpack:"",attachments:[]},active:{swiftUntilMs:0},selectedMap:"dam",deployMode:"raid",multiplayerRole:"host",multiplayerInviteCode:"",guestInviteCode:"",marketCategory:"medicine",pendingSale:null,secureContainer:[],selectedTab:"deploy"}}function _a(e){const t=e&&typeof e=="object"?e:va();t.coins=Number.isFinite(t.coins)?Math.max(0,Math.round(t.coins)):1e5,t.inventory=Array.isArray(t.inventory)?t.inventory.filter(a=>a&&w(a.defId)):[],t.inventory=t.inventory.map(a=>{const n=w(a.defId),r={...a,uid:a.uid||Ma(),type:n.type};return n.effect==="heal"&&!Number.isFinite(r.remaining)&&(r.remaining=n.healPool||60),n.type==="ammo"&&!Number.isFinite(r.remaining)&&(r.remaining=n.rounds||0),n.type==="loot"&&r.location!=="secure"&&(r.location="backpack"),r}),t.equipped={operator:xe.some(a=>a.id===t.equipped?.operator)?t.equipped.operator:"weicong",weapon:t.inventory.some(a=>a.uid===t.equipped?.weapon)?t.equipped.weapon:"",ammo:t.inventory.some(a=>a.uid===t.equipped?.ammo)?t.equipped.ammo:"",chestRig:t.inventory.some(a=>a.uid===t.equipped?.chestRig)?t.equipped.chestRig:"",helmet:t.inventory.some(a=>a.uid===t.equipped?.helmet)?t.equipped.helmet:"",armor:t.inventory.some(a=>a.uid===t.equipped?.armor)?t.equipped.armor:"",backpack:t.inventory.some(a=>a.uid===t.equipped?.backpack)?t.equipped.backpack:"",attachments:Array.isArray(t.equipped?.attachments)?t.equipped.attachments.filter(a=>t.inventory.some(n=>n.uid===a)):[]},ht(t),t.active={swiftUntilMs:Number(t.active?.swiftUntilMs||0)},t.selectedMap=ue.some(a=>a.id===t.selectedMap)?t.selectedMap:"dam",t.deployMode=Ae(t.deployMode||"raid"),t.multiplayerRole=We(t.multiplayerRole||"host"),t.multiplayerInviteCode=J(t.multiplayerInviteCode||""),t.guestInviteCode=J(t.guestInviteCode||""),t.marketCategory=xt(t.marketCategory||"medicine"),t.pendingSale=t.pendingSale?.uid?t.pendingSale:null,t.secureContainer=Array.isArray(t.secureContainer)?t.secureContainer.filter((a,n,r)=>r.indexOf(a)===n).filter(a=>t.inventory.some(n=>n.uid===a)).slice(0,4):[];for(const a of t.inventory)t.secureContainer.includes(a.uid)?a.location="secure":w(a.defId)?.type==="loot"&&a.location==="secure"&&(a.location="backpack");return t.selectedTab=gt(t.selectedTab||"deploy"),t}function lt(e){const t={uid:Ma(),defId:e.id,type:e.type,acquiredAt:Date.now()};return e.effect==="heal"&&(t.remaining=e.healPool||60),e.type==="ammo"&&(t.remaining=e.rounds||0),e.type==="tactical"&&(t.location="carried"),e.type==="loot"&&(t.value=e.value||0,t.location="backpack"),t}function Ma(){return globalThis.crypto?.randomUUID?globalThis.crypto.randomUUID():`item-${Date.now()}-${Math.floor(Math.random()*1e5)}`}function w(e){return $a.find(t=>t.id===e)||Re.find(t=>t.id===e)}function dt(e){return xe.find(t=>t.id===e.equipped?.operator)||xe[0]}function ke(e=x()){const t=W(e,"armor"),a=W(e,"helmet"),n=W(e,"chestRig"),r=Math.min(.65,(t?.protection||0)+(a?.protection||0)+(n?.protection||0));return{armor:t,helmet:a,chestRig:n,protection:r,incomingDamage:F(Math.max(2.5,4.5*(1-r)))}}function no(){return ke().incomingDamage}function Ce(e=x()){const t=le(e),a=t?w(t.defId):null,n=a?.power&&t?.remaining>0?a.power:1;return F(12.5*Math.max(1,n))}function W(e,t){const a=e.equipped?.[t],n=e.inventory?.find(r=>r.uid===a);return n?w(n.defId):null}function le(e){const t=e.equipped?.ammo;return e.inventory?.find(a=>a.uid===t)||null}function te(e=x()){return W(e,"weapon")}function ct(e){const t=new Set(e.equipped?.attachments||[]);return(e.inventory||[]).filter(a=>t.has(a.uid)).map(a=>w(a.defId)).filter(Boolean)}function pt(e,t=x()){return ct(t).find(a=>a.slot===e)||null}function Oe(e=x()){const t=ct(e),a=n=>t.find(r=>r.slot===n)||null;return{attachments:t,optic:a("optic"),laser:a("laser"),grip:a("grip"),stock:a("stock"),muzzle:a("muzzle"),mag:a("mag"),isBare:t.length===0}}function Fe(e=x()){const t=Oe(e);let a=t.isBare?1.48:1.16,n=t.isBare?.026:.019,r=t.isBare?.007:.0045;return t.grip&&(a*=.84,n*=.72,r*=.74),t.muzzle&&(a*=.9,n*=.78,r*=.82),t.stock&&(a*=.94,n*=.84,r*=.86),{spreadMultiplier:Math.round(a*1e3)/1e3,recoilKick:Math.round(n*1e4)/1e4,sideKick:Math.round(r*1e4)/1e4,recoilLabel:t.isBare?"\u9AD8":n<.012?"\u4F4E":"\u4E2D"}}function ut(e=x()){const t=te(e);return!!t?.supports4x||t?.weaponClass==="sniper"}function ft(e=x()){return ut(e)?ct(e).some(t=>t.scopeType==="4x"):!1}function ht(e){if(!ut(e)){const r=[];for(const o of e.equipped?.attachments||[]){const i=e.inventory?.find(l=>l.uid===o);w(i?.defId)?.sniperOnly||r.push(o)}e.equipped.attachments=r}const t=le(e),a=t?w(t.defId):null,n=te(e);a?.ammoClass==="aw"&&n?.id!=="gun-awm"&&(e.equipped.ammo="")}function qe(e,t=!1){if(!e?.weapon)return;const a=x(),n=te(a);if(!n){if(e.__realismEquippedWeaponUid){try{e.setWeaponVariant?.(0)}catch{}e.__realismEquippedWeaponUid="",Ue(e,window.__FPS_THREE__)}return}if(!(!t&&e.__realismEquippedWeaponUid===a.equipped.weapon&&e.weapon?.label===n.name)){if(typeof e.setWeaponVariant=="function"&&Number.isFinite(n.nativeIndex))try{e.setWeaponVariant(n.nativeIndex)}catch{}e.weapon&&(e.weapon.type=n.nativeType||e.weapon.type,e.weapon.label=n.name,n.id==="gun-bizon"&&(e.weapon.magazineSize=64,e.weapon.ammo=Math.min(e.weapon.ammo||64,e.weapon.magazineSize)),n.id==="gun-awm"&&(e.weapon.magazineSize=Math.min(e.weapon.magazineSize||25,8),e.weapon.ammo=Math.min(e.weapon.ammo||8,e.weapon.magazineSize),e.weapon.fireMode="semi")),e.__realismEquippedWeaponUid=a.equipped.weapon,Ue(e,window.__FPS_THREE__)}}function mt(e,t){return e.equipped?.weapon===t||e.equipped?.ammo===t||e.equipped?.chestRig===t||e.equipped?.helmet===t||e.equipped?.armor===t||e.equipped?.backpack===t||(e.equipped?.attachments||[]).includes(t)}function Z(e=x()){return(e.inventory||[]).filter(t=>w(t.defId)?.type==="loot"&&t.location!=="secure"&&!j(e,t.uid))}function Sa(e=x()){return(e.inventory||[]).filter(t=>w(t.defId)?.type!=="loot"&&!j(e,t.uid))}function fe(e=x()){const t=new Set(e.secureContainer||[]);return(e.inventory||[]).filter(a=>t.has(a.uid))}function j(e,t){return!!t&&(e.secureContainer||[]).includes(t)}function ka(e=x()){const t=W(e,"backpack"),a=8+Math.max(0,Number(t?.capacity||0)),n=Z(e).length;return{capacity:a,used:n,free:Math.max(0,a-n)}}function bt(e=x()){return ka(e).free}function ro(e){return["chestRig","helmet","armor","backpack"].includes(e?.type)}function Ca(e){return ro(e)?Math.max(1,Math.round((e.cost||0)*.65)):0}function oo(e,t){return(e.inventory||[]).filter(a=>a.defId===t).length}function io(e,t){return e.type==="medicine"?{id:"use-medicine",label:"\u4F7F\u7528"}:e.type==="loot"?{id:"sell-loot",label:"\u51FA\u552E"}:e.type==="tactical"?{id:"carry-tactical",label:"\u5E26\u5165"}:t?{id:"unequip-item",label:"\u5378\u4E0B"}:{id:"equip-item",label:"\u88C5\u5907"}}function so(e,t){return t.effect==="heal"?`\u5269\u4F59\u6062\u590D ${Math.round(Number.isFinite(e.remaining)?e.remaining:t.healPool||60)}`:t.effect==="swift"?"\u6301\u7EED 10 \u79D2":t.effect==="grenade"?`G \u6295\u63B7\uFF0C\u7206\u70B8\u534A\u5F84 ${t.radius} \u7C73`:t.effect==="flash"?`H \u6295\u63B7\uFF0C\u767D\u5C4F ${t.duration||3} \u79D2`:t.type==="ammo"?`\u5269\u4F59 ${Math.round(Number.isFinite(e.remaining)?e.remaining:t.rounds||0)} / ${t.rounds} \u53D1`:t.type==="weapon"?t.weaponClass==="sniper"?"\u72D9\u51FB\u67AA\uFF0C\u53EF\u7528\u56DB\u500D\u955C":`\u4F7F\u7528 ${t.ammoClass==="aw"?"AWM":"\u901A\u7528"} \u5B50\u5F39`:t.type==="loot"?`\u53EF\u5356 ${V(t.value)} \u6E38\u620F\u5E01`:t.capacity?`\u5BB9\u91CF +${t.capacity}`:t.protection?`\u9632\u62A4 ${Math.round(t.protection*100)}%`:t.slot?`\u69FD\u4F4D ${t.slot}`:""}function Aa(e){return e.type==="weapon"?"\u67AA\u68B0":e.type==="ammo"?"\u5B50\u5F39":e.type==="chestRig"?"\u80F8\u6302":e.type==="helmet"?"\u5934\u76D4":e.type==="armor"?"\u62A4\u7532":e.type==="backpack"?"\u80CC\u5305":e.type==="attachment"?"\u914D\u4EF6":e.type==="medicine"?"\u836F\u54C1":e.type==="tactical"?"\u6218\u672F\u9053\u5177":e.type==="loot"?"\u53D8\u5356\u7269":"\u7269\u54C1"}function gt(e){return["deploy","warehouse","operators","market","exchange"].includes(e)?e:"deploy"}function xt(e){return Et.some(t=>t.id===e)?e:"medicine"}function Ae(e){return e==="lan"||e==="multi"?"multi":"raid"}function We(e){return e==="guest"?"guest":"host"}function J(e){return String(e||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6)}function Da(){const e="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let t="";for(let a=0;a<4;a+=1)t+=e[Math.floor(Math.random()*e.length)];return t}function yt(e=x()){return e.multiplayerRole==="guest"?J(e.guestInviteCode||""):J(e.multiplayerInviteCode||"")}function lo(e){return`delta-room-${J(e).toLowerCase()}`}function wt(e,t=x()){if(!e)return;const a=yt(t);a&&(e.__realismLanRoomId=lo(a),co(e))}function co(e){const t=e?.lanClient;if(!t||t.__realismRoomPatch)return;const a=typeof t.join=="function"?t.join.bind(t):null;a&&(t.join=(n={})=>a({...n,targetRoomId:e.__realismLanRoomId||n.targetRoomId||n.roomId})),t.__realismRoomPatch=!0}function X(e=x()){return ue.find(t=>t.id===e.selectedMap)||ue[0]}function po(e){return Bt.find(t=>t.id===e)?.label||Ee.find(t=>t.id===e)?.label||""}function V(e){return Math.max(0,Number(e)||0).toLocaleString("zh-CN")}function y(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function k(){const e=document.getElementById("realism-delta-ui");e&&(e.dataset.dirty="1")}function h(e,t){e&&(e.message=t)}function uo(e){const t=e.target;if(!t)return!1;const a=t.tagName?.toLowerCase();return a==="input"||a==="textarea"||t.isContentEditable}function fo(e){if(!document?.body)return;const t=x(),a=ke(t),n=te(t),r=le(t),o=r?w(r.defId):null,i=Oe(t),s=Fe(t);let l=0,d=0,c=0,u=0,f=0,g=0,M=0,D=0,m=0,E=0;e.scene?.traverse?.(v=>{v.isLight&&v.castShadow&&(D+=1),v.isMesh&&(m+=1,v.visible&&(E+=1)),v.name==="realism-operator-model"&&(l+=1),v.userData?.blocksBullets&&(d+=1),v.isMesh&&v.castShadow&&(M+=1),v.userData?.interactionOutline&&(c+=1,v.visible&&(u+=1)),((v.name||"").includes("photo")||v.name==="dam-photoreal-vista")&&(f+=1),["shop-entry-inner-wall","street-shop-door-inner-wall-visible","street-shop-doorway-recess"].includes(v.name)&&(g+=1)});const R=e.player?.getPosition?.()||{x:0,y:0,z:0},$=e.arena?.group?.__realismDoors||[],B=e.arena?.group?.__realismManholes||[],P=$.length?Math.min(...$.map(v=>Math.hypot(R.x-(v.userData?.interactX||0),R.z-(v.userData?.interactZ||0)))):-1,H=B.length?Math.min(...B.map(v=>Math.hypot(R.x-(v.userData?.interactX||0),R.z-(v.userData?.interactZ||0)))):-1,_=(e.enemyRecords||[]).find(v=>v.enemy?.id===e.__realismQaWallTargetId),O=e.renderer?.info?.render||{},G=e.arena?.group?.__realismDamTunnelDoor,Ie=e.scene?.getObjectByName?.("realistic-low-sun");document.body.dataset.realismStatus=JSON.stringify({version:pe,bulletDamage:12.5,enemyBulletDamage:4.5,outgoingBulletDamage:Ce(t),shotsToDown:8,matchDuration:300,remainingTime:Tt(e),respawnDelay:3,coins:t.coins,inventoryItems:t.inventory?.length||0,warehouseItems:Sa(t).length,backpackItems:Z(t).length,secureItems:fe(t).length,secureCapacity:4,selectedMap:X(t).name,sellableItems:(t.inventory||[]).filter(v=>w(v.defId)?.type==="loot").length,equippedWeapon:n?.name||"",equippedAmmo:o?.name||"",equippedAmmoRemaining:r?.remaining||0,bareGun:i.isBare,equippedAttachments:i.attachments.map(v=>v.name),optic:i.optic?.name||"",laser:!!i.laser,awmRedHeadshot:qt(t),weaponSpread:e.weapon?.spread||0,recoilLabel:s.recoilLabel,fourPowerScope:ft(t),protection:a.protection,incomingPlayerDamage:a.incomingDamage,swiftRemaining:it(t),healPool:ya(t),playerHealth:He(e),doors:e.__realismDoors?.length||0,lootContainers:e.arena?.group?.__realismLootContainers?.length||0,colliders:e.arena?.colliders?.length||0,searchOpen:!!e.__realismSearch,bridgeWaterSeconds:Rr(e),searchRevealed:!!e.__realismSearch?.revealed,loadoutOpen:!!e.__realismLoadoutOpen,extractZone:!!e.arena?.group?.__realismExtractionZone,extracting:!!e.__realismExtraction,extracted:!!e.__realismExtraction?.completed,raidFailed:!!e.__realismRaidFailure,blueSpawns:e.arena?.teamSpawns?.blue?.length||0,redSpawns:e.arena?.teamSpawns?.red?.length||0,blueSoldiers:(e.enemyRecords||[]).filter(v=>v.enemy?.team==="blue").length,redSoldiers:(e.enemyRecords||[]).filter(v=>v.enemy?.team==="red").length,operatorModels:l,bulletBlockers:d,interactionOutlines:c,visibleInteractionOutlines:u,photoSceneryPanels:f,photoTexturesReady:[e.__realismMats?.damVistaPhoto?.map,e.__realismMats?.shopInteriorPhoto?.map,e.__realismMats?.concrete?.map,e.__realismMats?.asphalt?.map].filter(v=>Number(v?.image?.width||0)>4).length,blockedShopEntryMeshes:g,doorColliders:$.filter(v=>!!v.userData?.collider).length,openDoors:$.filter(v=>!!v.userData?.open).length,disabledDoorColliders:$.filter(v=>Number(v.userData?.collider?.minX||0)>9999).length,nearestDoorDistance:P,nearestManholeDistance:H,playerPosition:{x:Math.round(R.x*10)/10,y:Math.round(R.y*10)/10,z:Math.round(R.z*10)/10},qaWallTargetHealth:_?Number(_.__realismDamageState?.health??_.enemy?.health??0):-1,manholes:B.length,damShaftOpeningRadius:1.22,damShaftDropRadius:.98,damShaftVoid:!!e.scene?.getObjectByName?.("dam-shaft-black-void"),damShaftLids:e.scene?.getObjectByName?.("dam-shaft-open-lid")?1:0,damShaftBlueParts:e.scene?.getObjectByName?.("dam-tunnel-water-pipe")?1:0,undergroundColliders:(e.arena?.colliders||[]).filter(v=>v.underground).length,damVault:!!e.arena?.group?.__realismDamVault,damSecretDoor:!!G,damSecretDoorOpen:!!G?.userData?.open,damSecretRoute:"\u6CC4\u6D2A\u5899\u540E\u7AD6\u4E95 > \u76F4\u8D70 > \u5DE6\u8F6C > Z \u5F00\u95E8",playerUnderground:R.y<-1,africaStarSpawned:!!e.__realismHeartSpawnedThisRaid,africaStarPity:nt(),africaHeartSpawned:!!e.__realismHeartSpawnedThisRaid,africaHeartPity:nt(),insideDamBunker:!!e.__realismInsideDamBunker,rendererPixelRatio:Number(e.renderer?.getPixelRatio?.()||e.__realismPixelRatio||0),rendererCalls:Number(O.calls||0),rendererTriangles:Number(O.triangles||0),shadowCasters:Number(e.__realismShadowCasters||0),actualShadowCasters:M,shadowCastingLights:D,shadowAutoUpdate:!!e.renderer?.shadowMap?.autoUpdate,shadowNeedsUpdate:!!e.renderer?.shadowMap?.needsUpdate,shadowMapSize:Number(Ie?.shadow?.mapSize?.width||0),totalSceneMeshes:m,visibleSceneMeshes:E,adaptiveCullEntries:e.__realismAdaptiveCullEntries?.length||0,adaptiveCulledMeshes:Number(e.__realismAdaptiveCulledMeshes||0),wallDecorFixed:!!e.arena?.__realismWallDecorDone,screen:e.session?.screen||""})}function Ia(e,t){if(mo(e,t),e.renderer?.setClearColor&&e.renderer.setClearColor(8557210,1),ho(e,t),e.__realismLightingDone||!e.scene)return;e.__realismLightingDone=!0;for(const i of e.scene.children||[])!i?.isLight||(i.name||"").startsWith("realistic-")||typeof i.intensity=="number"&&(i.intensity*=i.isAmbientLight?.35:.55);const a=new t.HemisphereLight(14543858,3490614,1.08);a.name="realistic-open-sky-light",e.scene.add(a);const n=new t.DirectionalLight(16769720,3.65);n.name="realistic-low-sun",n.position.set(-24,42,16),n.castShadow=!0,n.shadow?.mapSize&&n.shadow.mapSize.set(1024,1024),n.shadow&&(n.shadow.bias=-35e-5,n.shadow.normalBias=.025,n.shadow.radius=3),n.shadow?.camera&&(n.shadow.camera.near=1,n.shadow.camera.far=150,n.shadow.camera.left=-82,n.shadow.camera.right=82,n.shadow.camera.top=82,n.shadow.camera.bottom=-82),e.scene.add(n);const r=new t.DirectionalLight(11127004,.46);r.name="realistic-cool-fill",r.position.set(34,18,-30),e.scene.add(r);const o=new t.Mesh(new t.SphereGeometry(1.35,32,18),e.__realismMats?.sunGlow||new t.MeshStandardMaterial({color:16766074}));o.name="visible-sun-disk",o.position.set(-34,30,-24),e.scene.add(o)}function ho(e,t){if(!e?.scene||e.scene.getObjectByName?.("realistic-sky-dome"))return;const a=document.createElement("canvas");a.width=1024,a.height=512;const n=a.getContext("2d"),r=n.createLinearGradient(0,0,0,512);r.addColorStop(0,"#315270"),r.addColorStop(.48,"#7194aa"),r.addColorStop(.72,"#c3c7bd"),r.addColorStop(1,"#747a73"),n.fillStyle=r,n.fillRect(0,0,1024,512);const o=31721;for(let c=0;c<28;c+=1){const u=Math.abs(Math.sin(o+c*37.17))*1120-48,f=140+Math.abs(Math.sin(o*.7+c*19.31))*185,g=54+Math.abs(Math.cos(o+c*8.23))*128,M=12+Math.abs(Math.sin(o+c*13.81))*30,D=n.createRadialGradient(u,f,2,u,f,g);D.addColorStop(0,"rgba(241,244,239,0.38)"),D.addColorStop(.46,"rgba(220,228,225,0.2)"),D.addColorStop(1,"rgba(182,194,196,0)"),n.fillStyle=D,n.beginPath(),n.ellipse(u,f,g,M,0,0,Math.PI*2),n.fill()}const i=n.createLinearGradient(0,318,0,430);i.addColorStop(0,"rgba(245,208,156,0)"),i.addColorStop(.5,"rgba(245,208,156,0.2)"),i.addColorStop(1,"rgba(245,208,156,0)"),n.fillStyle=i,n.fillRect(0,300,1024,150);const s=new t.CanvasTexture(a);t.SRGBColorSpace&&(s.colorSpace=t.SRGBColorSpace),s.needsUpdate=!0;const l=new t.MeshBasicMaterial({map:s,side:t.BackSide??1,depthWrite:!1,fog:!1}),d=new t.Mesh(new t.SphereGeometry(205,32,16),l);d.name="realistic-sky-dome",d.rotation.y=.72,d.frustumCulled=!1,d.renderOrder=-1e3,e.scene.add(d)}function mo(e,t){if(!e||e.__realismRenderPipelineDone)return;e.__realismRenderPipelineDone=!0;const a=e.renderer;if(a){const n=Math.min(Number(window.devicePixelRatio||1),1);a.setPixelRatio?.(n),a.setSize?.(window.innerWidth,window.innerHeight),t?.ACESFilmicToneMapping&&(a.toneMapping=t.ACESFilmicToneMapping),a.toneMappingExposure=1.03,t?.SRGBColorSpace&&(a.outputColorSpace=t.SRGBColorSpace),a.shadowMap&&(a.shadowMap.enabled=!0,a.shadowMap.autoUpdate=!1,a.shadowMap.needsUpdate=!0,t?.PCFShadowMap&&(a.shadowMap.type=t.PCFShadowMap)),a.physicallyCorrectLights=!0}e.scene&&t?.FogExp2&&(e.scene.fog=new t.FogExp2(8886170,.0049)),e.camera&&(e.camera.far=Math.max(260,Number(e.camera.far||0)),e.camera.near=Math.min(.08,Number(e.camera.near||.1)),e.camera.updateProjectionMatrix?.())}function Ea(e,t){if(!e?.renderer||!e.scene)return;const a=e.renderer,n=Math.min(Number(window.devicePixelRatio||1),1);a.setPixelRatio?.(n),a.setSize?.(window.innerWidth,window.innerHeight),a.shadowMap&&(a.shadowMap.enabled=!0,a.shadowMap.autoUpdate=!1,a.shadowMap.needsUpdate=!0,t?.PCFShadowMap&&(a.shadowMap.type=t.PCFShadowMap));const r=e.scene.getObjectByName?.("realistic-low-sun");r?.shadow?.mapSize&&(r.shadow.map&&(r.shadow.map.width>1024||r.shadow.map.height>1024)&&(r.shadow.map.dispose?.(),r.shadow.map=null),r.shadow.mapSize.set(1024,1024),r.shadow.needsUpdate=!0),e.scene.traverse?.(s=>{s?.isLight&&s!==r&&s.castShadow&&(s.castShadow=!1)});let o=0,i=0;e.scene.traverse?.(s=>{if(!s?.isMesh)return;const l=String(s.name||"").toLowerCase(),d=s.geometry?.parameters||{},c=Math.max(Number(d.width||0),Number(d.height||0),Number(d.depth||0),Number(d.radius||0)*2),u=["outline","seam","rib","rung","rail","frame","handle","latch","light","grass","leaf","smoke","glow","sign","poster","graffiti","window","goods","ripple","photo","sun-disk","underground","tunnel","shaft"].some(M=>l.includes(M)),f=["wall","building","roof","shop","cover","tree-trunk","pillar","column","gate","tank"].some(M=>l.includes(M));l.startsWith("operator-")&&["pelvis","torso","front-plate","head","ballistic-helmet","upper-arm","forearm","thigh","shin","boot","rifle-receiver"].some(M=>l.includes(M))&&i<96?(s.castShadow=!0,i+=1):!l.startsWith("operator-")&&!u&&(f||c>=3.4)&&o<72?(s.castShadow=!0,o+=1):s.castShadow=!1}),e.__realismShadowCasters=o+i,e.__realismSceneryShadowCasters=o,e.__realismCharacterShadowCasters=i,e.__realismPixelRatio=n,bo(e)}function bo(e){const t=[];e.scene?.traverse?.(a=>{if(!a?.isMesh||a.userData?.interactionOutline)return;const n=String(a.name||"").toLowerCase();if(["realistic-sky-dome","dam-photoreal-vista"].includes(n)||n.startsWith("operator-")&&["pelvis","torso","front-plate","head","ballistic-helmet","upper-arm","forearm","thigh","shin","boot","rifle-receiver"].some(c=>n.includes(c)))return;const o=a.geometry?.parameters||{},i=Math.max(Number(o.width||0),Number(o.height||0),Number(o.depth||0),Number(o.radius||0)*2),s=["underground","tunnel","vault-room","secret-door","shaft-side","shaft-bottom","shaft-ladder","shaft-upper"].some(c=>n.includes(c)),l=["grass","leaf","shrub","goods","stock","rib","seam","bolt","lace","eye","brow","mouth","ear","strap","pouch","handle","latch","ripple","pebble","debris","poster","graffiti","window-frame","sandbag"].some(c=>n.includes(c));if(!s&&!l&&!(i>0&&i<=1.25))return;const d=s?24:i>0&&i<=.38?18:l?26:32;t.push({mesh:a,baseVisible:a.visible,underground:s,maxDistance:d})}),e.__realismAdaptiveCullEntries=t,e.__realismAdaptiveCulledMeshes=0}function go(e,t){const a=e.__realismAdaptiveCullEntries||[],n=e.player?.getPosition?.();if(!a.length||!n||!t?.Vector3)return;const r=e.__realismCullWorldPosition||(e.__realismCullWorldPosition=new t.Vector3),o=!!e.__realismInsideDamBunker||n.y<-1;let i=0;for(const s of a){const l=s.mesh;if(!l?.parent||!s.baseVisible)continue;l.getWorldPosition?.(r);const d=Math.hypot(r.x-n.x,r.z-n.z),c=s.underground?o||d<=s.maxDistance:!o&&d<=s.maxDistance;l.visible=c,c||(i+=1)}e.__realismAdaptiveCulledMeshes=i}function xo(e){if(e.__realismExpanded)return;e.__realismExpanded=!0;const t=e.mode==="range"?1.45:Math.max(1.58,X().scale||1.58);for(const a of["size","width","depth"])typeof e[a]=="number"&&(e[a]*=t);for(const a of e.meshes||[]){if(!a||!a.position)continue;const n=a.geometry?.parameters||{},r=a.position.y<0&&(n.width||0)>15&&(n.depth||0)>15;a.position.x*=t,a.position.z*=t,r&&(a.scale.x*=t,a.scale.z*=t),a.name==="boundary-wall"&&((n.width||0)>=(n.depth||0)?a.scale.x*=t:a.scale.z*=t)}for(const a of e.colliders||[])a.minX*=t,a.maxX*=t,a.minZ*=t,a.maxZ*=t;vt(e.playerSpawn,t);for(const a of["enemySpawns","botRoute"])for(const n of e[a]||[])vt(n,t);if(e.teamSpawns)for(const a of Object.keys(e.teamSpawns))for(const n of e.teamSpawns[a]||[])vt(n,t)}function vt(e,t){e&&(typeof e.x=="number"&&(e.x*=t),typeof e.z=="number"&&(e.z*=t))}function yo(e,t){const a=e.arena;if(!a||!a.group)return;const n=e.__realismMats;for(const r of a.meshes||[])r?.isMesh&&(wo(r,n),vo(a.group,r,t,n),ii(a.group,r,t,n));Vo(a,t,n),!a.__realismLayoutAdded&&(a.__realismLayoutAdded=!0,_o(a,t,n),Mo(a,t,n),e.__realismDoors=a.group.__realismDoors||[])}function wo(e,t){if(e.__realismMaterialDone)return;e.__realismMaterialDone=!0;const a=e.name||"",n=e.position?.y||0;if(a.includes("boundary")){e.visible=!1,e.castShadow=!1,e.receiveShadow=!1;return}n<0?e.material=t.roof:a.includes("window")?e.material=t.glass:a.includes("ladder")||a.includes("rail")||a.includes("antenna")?e.material=t.darkMetal:a.includes("central")||a.includes("high-building")?e.material=t.stainedConcrete:a.includes("climb")||a.includes("cover")||a.includes("parapet")?e.material=t.concrete:a.includes("crate")&&(e.material=t.canvas),e.castShadow=!0,e.receiveShadow=!0}function vo(e,t,a,n){if(t.__realismBreakupDone)return;t.__realismBreakupDone=!0;const r=t.geometry?.parameters||{},o=(r.width||0)*(t.scale?.x||1),i=(r.height||0)*(t.scale?.y||1),s=(r.depth||0)*(t.scale?.z||1);if(i<.6||Math.max(o,s)<3)return;const l=Math.min(5,Math.max(2,Math.floor(Math.max(o,s)/5)));for(let d=1;d<l;d+=1){const c=d/l-.5;o>=s?(p(e,a,t.position.x+c*o,t.position.y+i*.12,t.position.z-s/2-.014,.035,i*.58,.028,n.grime,"weathered-seam"),p(e,a,t.position.x+c*o,t.position.y+i*.12,t.position.z+s/2+.014,.035,i*.58,.028,n.grime,"weathered-seam")):(p(e,a,t.position.x-o/2-.014,t.position.y+i*.12,t.position.z+c*s,.028,i*.58,.035,n.grime,"weathered-seam"),p(e,a,t.position.x+o/2+.014,t.position.y+i*.12,t.position.z+c*s,.028,i*.58,.035,n.grime,"weathered-seam"))}}function _o(e,t,a){const n=[[-34,-28,8,1.15,2.1],[34,28,8,1.15,2.1],[-43,10,2.2,1.05,8],[43,-10,2.2,1.05,8],[-14,-43,9,.95,2],[14,43,9,.95,2],[-50,-18,6,.8,2],[50,18,6,.8,2]];for(const[s,l,d,c,u]of n)me(e,t,s,l,d,c,u,a.concrete,"climb-platform"),Xe(e.group,t,a,s,c+.16,l,d,u,d>=u?"x":"z");const r=[[-27,34,0],[-27,35.1,.32],[-27,36.2,.64],[27,-34,0],[27,-35.1,.32],[27,-36.2,.64]];for(const[s,l,d]of r)me(e,t,s,l,5.6,d+.34,1.05,a.stainedConcrete,"climb-platform");const o=[[-24,-8,5.6,1.05,1.7],[-24,8,1.7,1.05,5.6],[24,8,5.6,1.05,1.7],[24,-8,1.7,1.05,5.6],[-10,-22,6.4,1.2,1.8],[10,22,6.4,1.2,1.8],[-38,34,4.8,1.05,2],[38,-34,4.8,1.05,2],[-60,4,2.2,1.2,5.8],[60,-4,2.2,1.2,5.8]];for(const[s,l,d,c,u]of o)me(e,t,s,l,d,c,u,a.concrete,"climb-platform"),Xe(e.group,t,a,s,c+.16,l,d,u,d>=u?"x":"z");const i=[[-8,-12,3.2,1.7,5.4],[8,12,3.2,1.7,5.4],[-36,-2,5.2,1.45,2.2],[36,2,5.2,1.45,2.2],[-18,28,2.6,1.8,4.8],[18,-28,2.6,1.8,4.8],[-48,44,4.4,1.6,2.4],[48,-44,4.4,1.6,2.4],[0,34,7.2,1.25,1.8],[0,-34,7.2,1.25,1.8]];for(const[s,l,d,c,u]of i)za(e,t,s,l,d,c,u,a.darkConcrete,"detail-cover")}function Mo(e,t,a){const n=e.group,r=X();So(e,t,a,r.id),ko(e,t,a,r.id),si(e,t,a,r.id),li(e,t,a,r.id),di(e,t,a,r.id);const o=Ro(r.id,a);for(const[l,d,c,u]of o)To(n,t,a,l,d,c,u),ti(e,l,d);Bo(e,t,a),Ho(e,t,a);const i=zo(r.id);for(const[l,d]of i)ui(e,t,a,l,d);const s=Po(r.id);for(const[l,d]of s)fi(n,t,a,l,d),C(e,"wooden-pallet",l,d,2.65,.58,2.35,{climbable:!0});Oo(e,t,a),Go(e,t,a),r.id==="dam"&&qo(e,t,a);for(const[l,d,c]of $o(r.id)){p(n,t,l,c/2,d,.18,c,.18,a.darkMetal,"light-pole");const u=p(n,t,l,c+.15,d,.9,.18,.36,a.metal,"work-light");u.rotation.y=l<0?-.4:.4}for(const[l,d]of Lo(r.id))St(n,t,a,l,d),C(e,"tree-trunk",l,d,.58,2.15,.58);for(const[l,d,c,u]of No(r.id))pi(n,t,a,l,d,c,u),C(e,"concrete-planter",l,d,c,.72,u,{climbable:!0})}function So(e,t,a,n){const r=e.group;if(n==="bridge"){p(r,t,0,.005,0,132,.03,132,a.grass,"bridge-valley-ground"),p(r,t,0,.025,0,132,.045,25,a.water,"bridge-river-water"),p(r,t,0,.08,16.5,132,.12,2.2,a.dirt,"bridge-river-bank-south"),p(r,t,0,.08,-16.5,132,.12,2.2,a.dirt,"bridge-river-bank-north"),p(r,t,0,.04,48,18,.055,38,a.asphalt,"bridge-blue-approach-road"),p(r,t,0,.04,-48,18,.055,38,a.asphalt,"bridge-red-approach-road"),he(r,t,a,-24,.065,42,18,15),he(r,t,a,24,.065,-42,18,15),Mt(r,t,a,0,0,78);return}if(n==="nuclear"){p(r,t,0,.012,0,86,.035,86,a.paleConcrete,"nuclear-concrete-yard"),p(r,t,-34,.03,0,10,.045,88,a.asphalt,"nuclear-service-road-west"),p(r,t,31,.03,0,14,.045,72,a.asphalt,"nuclear-service-road-east");for(const o of[-34,-18,-2,14,30])p(r,t,0,.065,o,74,.055,.22,a.hazardYellow,"nuclear-yard-warning-line"),p(r,t,0,.07,o+.55,74,.045,.12,a.darkMetal,"nuclear-yard-joint");he(r,t,a,-54,.055,34,13,16),he(r,t,a,54,.055,-34,13,16);return}if(n==="space"){p(r,t,0,.012,0,92,.035,92,a.runway,"space-runway-slab"),p(r,t,0,.055,0,15,.045,94,a.asphalt,"space-main-runway");for(const o of[-40,-28,-16,-4,8,20,32,44])p(r,t,0,.092,o,.75,.05,4.8,a.whitePaint,"space-runway-dash");p(r,t,-42,.028,-22,18,.045,46,a.paleConcrete,"space-hangar-apron"),p(r,t,42,.028,24,22,.045,38,a.paleConcrete,"space-launch-apron"),Mt(r,t,a,-20,8,62);return}p(r,t,0,.012,0,24,.035,96,a.asphalt,"dam-service-road"),p(r,t,0,.04,0,.18,.045,90,a.stripe,"dam-road-center-line"),p(r,t,-57,.02,0,11,.045,75,a.grass,"dam-left-green-bank"),p(r,t,57,.02,0,11,.045,75,a.grass,"dam-right-green-bank"),p(r,t,0,.035,-61,78,.04,12,a.water,"dam-lower-water-channel"),p(r,t,-34,.055,-45,18,.045,16,a.paleConcrete,"dam-overlook-paving"),p(r,t,34,.055,36,18,.045,16,a.paleConcrete,"dam-maintenance-paving"),Mt(r,t,a,0,0,94),he(r,t,a,-28,.055,-8,18,18),he(r,t,a,28,.055,8,18,18)}function ko(e,t,a,n){return n==="bridge"?Co(e,t,a):n==="nuclear"?Io(e,t,a):n==="space"?Eo(e,t,a):Do(e,t,a)}function Co(e,t,a){const n=e.group;n.__realismBridgeRiver={minX:-66,maxX:66,minZ:-13.5,maxZ:13.5,safeBridgeHalfWidth:2.55,deathSeconds:10},Ao(e,t,a);for(const[r,o,i,s]of[[-18,28,15,2.2],[18,28,15,2.2],[-18,-28,15,2.2],[18,-28,15,2.2]])me(e,t,r,o,i,.95,s,a.concrete,"bridgehead-sandbag-wall"),Xe(n,t,a,r,1.1,o,i,s,"x");for(const[r,o,i]of[[-32,34,a.spawnBlue],[32,34,a.spawnBlue],[-32,-34,a.spawnRed],[32,-34,a.spawnRed]])za(e,t,r,o,5.2,1.55,3.2,a.darkConcrete,"bridgehead-bunker"),p(n,t,r,1.55,o,4.2,.18,2.2,i,"bridgehead-bunker-team-mark"),p(n,t,r,2.45,o,5.7,.32,3.6,a.darkConcrete,"bridgehead-bunker-roof");for(const[r,o,i]of[[-42,22,5.2],[42,22,5.2],[-42,-22,5.2],[42,-22,5.2]])p(n,t,r,i/2,o,.22,i,.22,a.darkMetal,"bridge-watch-post"),p(n,t,r,i+.15,o,1.1,.18,.42,a.warmLight,"bridge-watch-lamp"),C(e,"bridge-watch-post",r,o,.45,i,.45);Y(n,t,"\u94C1\u7D22\u6865\u7A81\u56F4",0,4.5,18.5,0),Y(n,t,"\u6865\u5934\u9635\u5730",0,4.5,-18.5,Math.PI)}function Ao(e,t,a){const n=e.group;for(let r=-55;r<=55;r+=2.35){const o=p(n,t,0,.42,r,3.45,.18,1.42,a.shelfWood,"luding-style-bridge-plank");o.rotation.z=Math.sin(r*.18)*.018,e.meshes.push(o),C(e,"luding-style-bridge-plank",0,r,3.6,.58,1.55,{climbable:!0})}for(const r of[-1.95,1.95]){b(n,t,r,1.1,0,.09,116,a.darkMetal,"bridge-side-iron-chain","z"),b(n,t,r,.58,0,.075,116,a.darkMetal,"bridge-floor-iron-chain","z");for(let o=-54;o<=54;o+=6)b(n,t,r,.88,o,.035,1.2,a.darkMetal,"bridge-chain-hanger","y")}for(const r of[-19,19])p(n,t,-2.35,2.05,r,.72,4.1,1.05,a.stainedConcrete,"bridge-chain-anchor-tower"),p(n,t,2.35,2.05,r,.72,4.1,1.05,a.stainedConcrete,"bridge-chain-anchor-tower"),p(n,t,0,3.95,r,5.8,.32,1.25,a.darkConcrete,"bridge-anchor-crossbeam"),C(e,"bridge-chain-anchor-tower",-2.35,r,.72,4.1,1.05),C(e,"bridge-chain-anchor-tower",2.35,r,.72,4.1,1.05);for(const[r,o]of[[-6,15],[6,15],[-6,-15],[6,-15]])b(n,t,r,.72,o,.34,1.44,a.sandbag,"bridgehead-stacked-sandbag","x"),C(e,"bridgehead-stacked-sandbag",r,o,1.55,.76,.72,{climbable:!0})}function Do(e,t,a){const n=e.group;for(const[r,o,i]of[[-34,-53,18],[-12,-53,16],[12,-53,16],[34,-53,18]])me(e,t,r,o,i,.95,2.1,a.concrete,"dam-overlook-cover"),Xe(n,t,a,r,1.1,o,i,2.1,"x");for(const r of[-22,0,22])p(n,t,r,1.8,-55,1.25,3.2,.35,a.darkMetal,"dam-spillway-pillar"),p(n,t,r,3.45,-55,6.5,.22,.55,a.metal,"dam-catwalk"),C(e,"dam-spillway-pillar",r,-55,1.25,3.2,.35);p(n,t,-46,.64,-14,16,1.28,2.4,a.darkConcrete,"dam-pipe-gallery"),p(n,t,46,.64,18,16,1.28,2.4,a.darkConcrete,"dam-pipe-gallery"),C(e,"dam-pipe-gallery",-46,-14,16,1.28,2.4),C(e,"dam-pipe-gallery",46,18,16,1.28,2.4);for(const[r,o]of[[-44,-10],[-48,-18],[44,14],[48,22]])b(n,t,r,1.05,o,.32,8,a.pipeBlue,"dam-blue-water-pipe","x")}function Io(e,t,a){const n=e.group;for(const[r,o]of[[-10,22],[12,-24]])b(n,t,r,1.1,o,1.45,2.2,a.metal,"nuclear-storage-tank","y"),b(n,t,r,2.25,o,1.45,.16,a.darkMetal,"nuclear-tank-cap","y"),C(e,"nuclear-storage-tank",r,o,2.9,2.35,2.9);for(const[r,o,i,s,l]of[[-18,6,30,"x",a.pipeRed],[18,-8,34,"x",a.pipeBlue],[44,6,36,"z",a.pipeRed],[-44,-10,34,"z",a.pipeBlue]])b(n,t,r,.82,o,.22,i,l,"nuclear-raised-pipe",s),p(n,t,r,.36,o,s==="x"?i:.32,.18,s==="z"?i:.32,a.darkMetal,"nuclear-pipe-shadow-rail");for(const[r,o,i,s]of[[0,38,26,3.2],[0,-38,26,3.2],[-54,0,3.2,24],[54,0,3.2,24]])me(e,t,r,o,i,.72,s,a.concrete,"nuclear-low-blast-wall");p(n,t,0,1.65,0,9,3.3,7,a.stainedConcrete,"nuclear-control-block"),p(n,t,0,3.45,0,9.4,.28,7.4,a.darkConcrete,"nuclear-control-roof"),C(e,"nuclear-control-block",0,0,9,3.3,7)}function Eo(e,t,a){const n=e.group;for(const[r,o,i,s]of[[-48,-22,15,18],[-48,18,15,22]])p(n,t,r,1.9,o,i,3.8,s,a.stainedConcrete,"space-hangar-shell"),p(n,t,r+7.7,1.24,o,.32,2.35,s-2.4,a.darkMetal,"space-hangar-open-door"),p(n,t,r,4.05,o,i+.8,.42,s+.8,a.darkConcrete,"space-hangar-roof"),C(e,"space-hangar-shell",r,o,i,3.8,s);b(n,t,42,.14,24,9.8,.2,a.paleConcrete,"space-launch-pad","y"),b(n,t,42,.24,24,5.8,.16,a.darkConcrete,"space-launch-pad-inner","y");for(const r of[0,Math.PI/2,Math.PI,Math.PI*1.5]){const o=42+Math.cos(r)*8.2,i=24+Math.sin(r)*8.2;p(n,t,o,1.05,i,.55,2.1,.55,a.darkMetal,"space-launch-pad-post"),C(e,"space-launch-pad-post",o,i,.55,2.1,.55)}for(const[r,o]of[[24,-34],[34,-38],[44,-34]])b(n,t,r,1.45,o,.9,2.9,a.metal,"space-fuel-tank","y"),b(n,t,r,2.95,o,.9,.22,a.warmLight,"space-fuel-tank-cap","y"),C(e,"space-fuel-tank",r,o,1.8,3.05,1.8);b(n,t,34,.7,-18,.18,32,a.pipeRed,"space-fuel-line","z"),b(n,t,50,.74,6,.18,36,a.pipeBlue,"space-oxygen-line","z")}function Ro(e,t){return e==="bridge"?[[-58,44,"\u6E21\u53E3\u8865\u7ED9\u7AD9",t.awningBlue],[58,-44,"\u6865\u5934\u6742\u8D27\u94FA",t.awningRed],[-58,-32,"\u6CB3\u8C37\u836F\u623F",t.awningRed],[58,32,"\u94C1\u7D22\u7EF4\u4FEE\u94FA",t.awningBlue]]:e==="nuclear"?[[-58,34,"\u8F90\u5C04\u68C0\u6D4B\u7AD9",t.awningRed],[58,-34,"\u7EF4\u4FEE\u8865\u7ED9\u94FA",t.awningBlue],[-58,-28,"\u5DE5\u533A\u836F\u623F",t.awningRed],[58,28,"\u51B7\u5374\u5854\u5496\u5561",t.awningBlue]]:e==="space"?[[-58,40,"\u822A\u5929\u4FBF\u5229\u7AD9",t.awningBlue],[58,-38,"\u71C3\u6599\u7EF4\u4FEE\u90E8",t.awningRed],[-58,-42,"\u673A\u5E93\u836F\u623F",t.awningRed],[58,42,"\u661F\u6E2F\u5496\u5561",t.awningBlue]]:[[-58,-25,"\u6D77\u6E7E\u4FBF\u5229\u5E97",t.awningBlue],[58,25,"\u6218\u5730\u5496\u5561",t.awningRed],[-52,36,"\u5317\u5CB8\u836F\u623F",t.awningRed],[52,-36,"\u88C5\u5907\u7EF4\u4FEE",t.awningBlue]]}function zo(e){return e==="bridge"?[[-36,30],[-39,28],[36,-30],[39,-28],[-8,24],[8,-24],[-48,8],[48,-8]]:e==="nuclear"?[[-38,-26],[-41,-23],[38,22],[41,25],[-12,34],[16,-34],[28,8],[-28,-8]]:e==="space"?[[22,-34],[24,-36],[34,-40],[52,10],[-52,-6],[-34,36],[12,42],[-12,-42]]:[[-38,-6],[-40,-4.2],[38,6],[40,4.2],[-8,38],[8,-38],[-44,-18],[44,18]]}function Po(e){return e==="bridge"?[[-26,34],[26,-34],[-44,20],[44,-20],[-10,48],[10,-48]]:e==="nuclear"?[[-47,26],[47,-26],[-21,42],[21,-42],[0,18],[0,-18]]:e==="space"?[[-37,34],[-42,-34],[28,50],[52,18],[-24,-50],[12,-52]]:[[-47,26],[47,-26],[-21,42],[21,-42],[-34,-44],[34,44]]}function $o(e){return e==="bridge"?[[-52,36,4.5],[52,-36,4.5],[-30,22,4.2],[30,-22,4.2],[-10,56,4.8],[10,-56,4.8]]:e==="nuclear"?[[-54,-36,4.8],[54,36,4.8],[-52,32,4.4],[52,-32,4.4],[0,44,5.2],[0,-44,5.2]]:e==="space"?[[-58,-44,5.2],[58,44,5.2],[-48,28,4.8],[48,-28,4.8],[18,52,5.6],[-18,-52,5.6]]:[[-54,-36,4.4],[54,36,4.4],[-52,32,3.8],[52,-32,3.8],[-8,-54,4.2],[8,54,4.2]]}function Lo(e){return e==="bridge"?[[-62,28],[-62,-28],[62,28],[62,-28],[-46,54],[46,-54],[-34,-54],[34,54],[-16,18],[16,-18]]:e==="nuclear"?[[-62,42],[62,-42],[-66,12],[66,-12]]:e==="space"?[[-64,48],[64,-48],[-64,-48],[64,48]]:[[-62,-6],[-62,12],[62,-12],[62,6],[-30,52],[30,-52],[-48,-48],[48,48],[-66,30],[66,-30]]}function No(e){return e==="bridge"?[[-46,38,12,2.4],[46,-38,12,2.4],[-54,-18,2.4,10],[54,18,2.4,10]]:e==="nuclear"?[[-46,-44,11,2.4],[46,44,11,2.4],[-58,8,2.4,12],[58,-8,2.4,12]]:e==="space"?[[-18,52,12,2.3],[18,-52,12,2.3],[-58,8,2.4,10],[58,-8,2.4,10]]:[[-46,-8,10,2.6],[46,8,10,2.6],[-12,52,14,2.4],[12,-52,14,2.4]]}function Bo(e,t,a){oe({arena:e});for(const[n,r]of[["blue",a.spawnBlue],["red",a.spawnRed]])for(const o of e.teamSpawns?.[n]||[])b(e.group,t,o.x,.035,o.z,.9,.055,r,`${n}-fixed-spawn-pad`,"y"),p(e.group,t,o.x,.1,o.z,1.25,.035,.18,r,`${n}-fixed-spawn-mark`),p(e.group,t,o.x,.1,o.z,.18,.035,1.25,r,`${n}-fixed-spawn-mark`)}function Ho(e,t,a){if(e.group.__realismExtractionZone)return;oe({arena:e});const n=e.teamSpawns?.blue?.[0]||{x:-24,z:52},r=Math.max(-62,Math.min(62,(n.x||0)-34)),o=Math.max(-58,Math.min(58,(n.z||0)+2)),i=e.group,s=b(i,t,r,.055,o,1,.045,a.extractGreen,"green-extraction-circle","y");s.renderOrder=2,b(i,t,r,.08,o,1+.08,.035,a.extractGreen,"green-extraction-ring","y");const l=[],d=[[0,0],[.42,.18],[-.32,.24],[.18,-.38],[-.44,-.2],[.05,.48]];for(let c=0;c<d.length;c+=1){const[u,f]=d[c],g=z(i,t,r+u,.78+c*.05,o+f,.34,a.extractSmoke.clone?.()||a.extractSmoke,"extract-green-smoke");g.userData={baseY:g.position.y,phase:c*.9},l.push(g)}i.__realismExtractionZone={x:r,z:o,radius:1,holdSeconds:5,smoke:l}}function Oo(e,t,a){const n=e.group,r=X();if(r.id==="bridge"){for(const[o,i,s]of[[-66,0,-1],[66,0,1]])p(n,t,o,1.2,i,2.6,2.4,22,a.stainedConcrete,"bridge-valley-cliff-face"),p(n,t,o-s*1.1,2.7,i,.32,1.5,20,a.grime,"bridge-cliff-shadow-line");for(const[o,i]of[[-18,19.2],[18,19.2],[-18,-19.2],[18,-19.2]])b(n,t,o,1.35,i,.58,2.7,a.trunk,"bridge-old-anchor-post","y"),b(n,t,o,2.75,i,.42,.18,a.darkMetal,"bridge-anchor-post-cap","y");b(n,t,0,.05,0,18.5,.035,a.water,"bridge-river-glow-disc","y"),p(n,t,0,.12,0,128,.03,.22,a.whitePaint,"bridge-water-ripple-line"),p(n,t,-22,.13,4.6,34,.025,.16,a.whitePaint,"bridge-water-ripple-line"),p(n,t,22,.13,-4.8,34,.025,.16,a.whitePaint,"bridge-water-ripple-line"),Y(n,t,"\u5927\u6E21\u6CB3",-50,1.25,0,Math.PI/2),Y(n,t,"\u593A\u6865\u8DEF\u7EBF",5.2,1.8,44,Math.PI);return}if(r.id==="nuclear"){for(const[o,i,s]of[[-66,22,1],[66,-22,.92],[48,48,.72]])b(n,t,o,2.1,i,2.3,4.2,a.stainedConcrete,"cooling-tower-base","y"),b(n,t,o,4.35,i,1.65*s,1.2,a.concrete,"cooling-tower-neck","y"),z(n,t,o-.35,5.15,i+.25,.34*s,a.grime,"cooling-tower-steam").scale.set(1.4,.55,1),z(n,t,o+.32,5.32,i-.12,.26*s,a.grime,"cooling-tower-steam").scale.set(1.55,.5,1),p(n,t,o,.08,i+4.2,8.4,.12,.35,a.stripe,"nuclear-warning-stripe");p(n,t,-2,2.05,-58,17,4.1,2.2,a.stainedConcrete,"nuclear-front-security-wall"),p(n,t,-2,4.25,-58,17.6,.25,2.4,a.hazardYellow,"nuclear-security-wall-cap"),Y(n,t,"\u63A7\u5236\u533A",-2,4.8,-59.2,0),Y(n,t,"\u6838\u7535\u7AD9",0,4.2,-62,0);return}if(r.id==="space"){b(n,t,66,5.2,24,.68,10.4,a.metal,"rocket-body","y"),b(n,t,66,10.85,24,.7,1.2,a.warmLight,"rocket-nose","y");for(const[o,i]of[[-.78,-.45],[.78,-.45],[-.78,.45],[.78,.45]])b(n,t,66+o,2.6,24+i,.22,5.2,a.darkMetal,"rocket-booster","y");p(n,t,62.7,4.2,24,.32,8.4,3.3,a.darkMetal,"launch-tower"),p(n,t,64.4,8.2,24,3.6,.18,.32,a.darkMetal,"launch-arm"),p(n,t,60.9,2.2,24,.22,4.4,5.8,a.darkMetal,"launch-service-ladder"),b(n,t,-64,3.2,-30,1.25,.18,a.glass,"space-radar-dish","z"),b(n,t,-64,1.55,-30,.12,3.1,a.darkMetal,"space-radar-mast","y"),Y(n,t,"\u822A\u5929\u57FA\u5730",-62,4.2,0,Math.PI/2);return}p(n,t,0,1.9,-68,58,3.8,1.2,a.stainedConcrete,"dam-wall"),p(n,t,0,.08,-73,64,.12,7.2,a.water,"dam-water-reservoir");for(const o of[-22,-11,0,11,22])p(n,t,o,.92,-66.8,2.8,1.7,.4,a.darkMetal,"dam-gate");for(const o of[-28,-14,0,14,28])p(n,t,o,3.85,-67.4,.18,1.3,1.1,a.darkMetal,"dam-gate-hoist"),b(n,t,o,4.58,-67.4,.28,.22,a.metal,"dam-hoist-wheel","z");p(n,t,0,4.05,-64.4,54,.18,.32,a.darkMetal,"dam-top-rail"),Y(n,t,"\u6CC4\u6D2A\u95F8",-27,3.8,-66,0),Y(n,t,"\u4E00\u53F7\u5927\u575D",0,4.35,-66.2,0),Fo(n,t,a)}function Fo(e,t,a){if(!t?.PlaneGeometry||!a.damVistaPhoto||e.getObjectByName?.("dam-photoreal-vista"))return;const n=new t.Mesh(new t.PlaneGeometry(720,480),a.damVistaPhoto);n.name="dam-photoreal-vista",n.position.set(0,75,-155),n.renderOrder=-4,n.castShadow=!1,n.receiveShadow=!1,n.frustumCulled=!1,e.add(n)}function qo(e,t,a){const n=e.group;if(n.__realismDamSecretAdded)return;n.__realismDamSecretAdded=!0,n.__realismManholes=n.__realismManholes||[],n.__realismLootContainers=n.__realismLootContainers||[];const{entranceX:r,entranceZ:o,floorY:i,straightEndZ:s,doorX:l,chamberEndX:d,corridorWidth:c,ceilingY:u}=I,f=u-i,g=i+f/2,M=c/2;C(e,"dam-main-spillway-wall",0,-68,58,3.8,1.2);const D=6,m=5,E=1.22*2+.16,R=(D-E)/2,$=(m-E)/2;for(const[L,Ze,je,Ve]of[[r-(E+R)/2,o,R,m],[r+(E+R)/2,o,R,m],[r,o-(E+$)/2,E,$],[r,o+(E+$)/2,E,$]])p(n,t,L,.1,Ze,je,.2,Ve,a.paleConcrete,"dam-rear-service-deck"),C(e,"dam-rear-service-deck",L,Ze,je,.2,Ve,{climbable:!0});Y(n,t,"\u6CC4\u6D2A\u68C0\u4FEE\u4E95",r-2.7,1.25,o+2.1,0);const B=Wo(t,a,r,o);n.add(B),n.__realismManholes.push(B),p(n,t,r,i-.08,o,2.18,.16,2.18,a.tunnelFloor,"dam-shaft-bottom-floor");for(const L of[r-1.02,r+1.02])p(n,t,L,i/2,o,.18,Math.abs(i),2.18,a.tunnelConcrete,"dam-shaft-side-wall"),C(e,"dam-shaft-side-wall",L,o,.18,Math.abs(i),2.18,{underground:!0});p(n,t,r,i/2,o+1.02,2.18,Math.abs(i),.18,a.tunnelConcrete,"dam-shaft-ladder-wall"),C(e,"dam-shaft-ladder-wall",r,o+1.02,2.18,Math.abs(i),.18,{underground:!0}),p(n,t,r,-2.45,o-1.02,2.18,4.9,.18,a.tunnelConcrete,"dam-shaft-upper-wall");for(const L of[r-.34,r+.34])p(n,t,L,i/2-.1,o+.82,.065,Math.abs(i)-.35,.09,a.metal,"dam-shaft-ladder-rail");for(let L=i+.42;L<=-.34;L+=.52)p(n,t,r,L,o+.8,.76,.055,.09,a.metal,"dam-shaft-ladder-rung");const P=Math.abs(s-o),H=(o+s)/2;p(n,t,r,i-.08,H,c+.25,.16,P,a.tunnelFloor,"dam-underground-straight-floor"),p(n,t,r,u,H,c+.25,.18,P,a.tunnelCeiling,"dam-underground-straight-ceiling"),de(e,t,a,r+M+.1,g,H,.2,f,P,"dam-underground-straight-wall");const _=Math.max(1,P-c);de(e,t,a,r-M-.1,g,(o+s+c/2)/2,.2,f,_,"dam-underground-straight-wall");const O=r-l,G=(r+l)/2;p(n,t,G,i-.08,s,O,.16,c+.25,a.tunnelFloor,"dam-underground-left-turn-floor"),p(n,t,G,u,s,O,.18,c+.25,a.tunnelCeiling,"dam-underground-left-turn-ceiling"),de(e,t,a,G,g,s-M-.1,O,f,.2,"dam-underground-left-turn-wall");const Ie=Math.max(1,O-c);de(e,t,a,(l+r-c/2)/2,g,s+M+.1,Ie,f,.2,"dam-underground-left-turn-wall");for(const[L,Ze,je]of[[r,o-5,0],[r,o-13,0],[r,o-21,0],[18,s,Math.PI/2],[10.5,s,Math.PI/2]]){const Ve=p(n,t,L,u-.12,Ze,1.25,.07,.18,a.tunnelLight,"dam-tunnel-ceiling-light");Ve.rotation.y=je}for(const L of[r-1.35,r+1.35])b(n,t,L,u+.35,H,.09,P-1.2,a.darkMetal,"dam-tunnel-drain-pipe","z");const v=l-d,kt=(l+d)/2,ge=5.6;p(n,t,kt,i-.08,s,v,.16,ge,a.tunnelFloor,"dam-vault-room-floor"),p(n,t,kt,u,s,v,.18,ge,a.tunnelCeiling,"dam-vault-room-ceiling");for(const L of[s-ge/2,s+ge/2])de(e,t,a,kt,g,L,v,f,.22,"dam-vault-room-wall");de(e,t,a,d,g,s,.22,f,ge,"dam-vault-room-end-wall");const Ge=2.4,Ct=(ge-Ge)/2;for(const L of[s-(Ge+Ct)/2,s+(Ge+Ct)/2])de(e,t,a,l,g,L,.22,f,Ct,"dam-vault-room-front-wall");const Di=Xo(e,t,a,l,s,Ge);n.__realismDamTunnelDoor=Di;const K=new t.Group;K.name="searchable-dam-secret-vault",K.position.set(d+1.65,i,s),K.userData={label:"\u975E\u6D32\u4E4B\u661F\u5BC6\u85CF",searched:!1,tier:"red",lootBias:.18,kind:"damVault",africaStarSpawned:!1};const At=Ra(K,t,a,"damVault","red");Be(K,t),n.add(K),n.__realismLootContainers.push(K),C(e,"dam-secret-vault",K.position.x,K.position.z,At.w,At.h,At.d,{underground:!0}),n.__realismDamVault=K,n.__realismDamLadder={x:r,z:o+.8,floorY:i},n.__realismDamSecretLayout={...I}}function Wo(e,t,a,n){const r=new e.Group;if(r.name="dam-spillway-open-shaft",r.position.set(a,0,n),r.userData={label:"\u6CC4\u6D2A\u68C0\u4FEE\u7AD6\u4E95",interactX:a,interactZ:n,destination:"shaft"},e?.TorusGeometry){const i=new e.Mesh(new e.TorusGeometry(1.22,.075,8,40),t.darkMetal);i.name="dam-shaft-metal-rim",i.rotation.x=Math.PI/2,i.position.y=.205,i.castShadow=!1,i.receiveShadow=!0,r.add(i)}const o=b(r,e,0,.185,0,1.22-.07,.025,t.shaftVoid,"dam-shaft-black-void","y");return o.castShadow=!1,o.receiveShadow=!1,o.userData.isVisualVoid=!0,r}function de(e,t,a,n,r,o,i,s,l,d){return p(e.group,t,n,r,o,i,s,l,a.tunnelConcrete||a.stainedConcrete,d),C(e,d,n,o,i,s,l,{underground:!0})}function Xo(e,t,a,n,r,o){const i=e.group,s=2.5,l=I.floorY;p(i,t,n,l+s+.14,r,.24,.22,o+.34,a.darkMetal,"dam-secret-door-frame-top"),p(i,t,n,l+s/2,r-o/2-.1,.24,s,.2,a.darkMetal,"dam-secret-door-frame-left"),p(i,t,n,l+s/2,r+o/2+.1,.24,s,.2,a.darkMetal,"dam-secret-door-frame-right");const d=new t.Group;d.name="interactive-dam-secret-door",d.position.set(n,l,r-o/2),d.userData={open:!1,targetAngle:0,closedAngle:0,openAngle:1.36,interactX:n,interactZ:r,kind:"dam-secret-door"},p(d,t,0,s/2,o/2,.13,s,o,a.doorPaint,"dam-secret-door-slab"),p(d,t,-.075,1.42,o*.78,.08,.12,.42,a.warmLight,"dam-secret-door-handle"),Be(d,t),i.add(d),i.__realismDoors=i.__realismDoors||[],i.__realismDoors.push(d);const c=C(e,"interactive-dam-secret-door",n,r,.24,s,o,{underground:!0});return c&&(c.closedBounds={minX:c.minX,maxX:c.maxX,minZ:c.minZ,maxZ:c.maxZ},d.userData.collider=c),d}function Uo(e){const t=e?.player;if(!t||t.__realismUndergroundTraversalInstalled||typeof t.update!="function")return;t.__realismUndergroundTraversalInstalled=!0;const a=t.update;t.update=function(r,o,i,s){const l=e.__realismDamDescent;if(l){l.elapsed+=r;const P=Math.min(1,l.elapsed/l.duration),H=P*P*(3-2*P);this.position.set(l.x,l.startY+(I.floorY-l.startY)*H,l.z),this.velocity?.set?.(0,0,0),this.grounded=!1,this.syncCamera?.(!1),P>=1&&(e.__realismDamDescent=null,e.__realismInsideDamBunker=!0,this.position.set(I.entranceX,I.floorY,I.entranceZ-.45),this.yaw=0,this.pitch=0,this.grounded=!0,this.syncCamera?.(!1),h(e,"\u5DF2\u8DF3\u5165\u5927\u575D\u4E0B\u65B9\u6CC4\u6D2A\u5BC6\u9053"));return}if(!e.__realismInsideDamBunker){a.call(this,r,o,(i||[]).filter(P=>!P.underground),s);return}const d=this.position.y;this.position.y-=I.floorY,a.call(this,r,o,(i||[]).filter(P=>P.underground),s),this.position.y+=I.floorY;const c=Math.hypot(this.position.x-I.entranceX,this.position.z-I.entranceZ),u=c<=1.24&&d<-.08,f=I.entranceX,g=I.entranceZ+.8,M=f-this.position.x,D=g-this.position.z,m=Math.max(.001,Math.hypot(M,D)),E=-Math.sin(this.yaw||0),R=-Math.cos(this.yaw||0),$=(E*M+R*D)/m>.42,B=Number(e.__realismQaForceClimbUntil||0)>performance.now();u&&($&&o?.isDown?.("KeyW")||B)?(this.position.x+=(f-this.position.x)*.24,this.position.z+=(I.entranceZ+.14-this.position.z)*.24,this.position.y=Math.min(.12,d+r*3.2),this.velocity?.set?.(0,0,0),this.grounded=!1,this.position.y>=-.04&&(e.__realismInsideDamBunker=!1,e.__realismQaForceClimbUntil=0,this.position.set(I.entranceX,.22,I.entranceZ+1.35),this.velocity?.set?.(0,0,0),this.yaw=0,this.pitch=0,this.grounded=!0,h(e,"\u5DF2\u6CBF\u68AF\u5B50\u722C\u56DE\u6CC4\u6D2A\u5899\u540E\u65B9"))):c>1.35&&this.position.y>I.floorY+1.38&&(this.position.y=I.floorY+1.38,this.velocity?.y>0&&(this.velocity.y=0)),this.syncCamera?.(o?.isDown?.("KeyC"))}}function Yo(e){if(!e?.player?.position)return;const t=X().id==="dam"&&!!e.arena?.group?.__realismDamSecretAdded;if(!t||e.session?.screen!=="playing"){t||(e.__realismDamDescent=null,e.__realismInsideDamBunker=!1);return}if(e.__realismInsideDamBunker||e.__realismDamDescent)return;const a=e.player;Math.hypot(a.position.x-I.entranceX,a.position.z-I.entranceZ)>.98||Number(a.position.y||0)>.75||(e.__realismDamDescent={x:I.entranceX,z:I.entranceZ,startY:Math.max(.1,Number(a.position.y||0)),elapsed:0,duration:.9},a.velocity?.set?.(0,0,0),h(e,"\u6B63\u5728\u5760\u5165\u6CC4\u6D2A\u7AD6\u4E95"))}function Go(e,t,a){if(e.group.__realismLootContainers?.length)return;const n=e.group;n.__realismLootContainers=[];const r=Zo(X().id);for(const o of r){const{x:i,z:s,label:l,tier:d,bias:c,kind:u,rotation:f=0}=o,g=new t.Group;g.name="searchable-loot-container",g.position.set(i,0,s),g.rotation.y=f,g.userData={label:l,searched:!1,tier:d,lootBias:c,kind:u};const M=Ra(g,t,a,u,d);Be(g,t),n.add(g),n.__realismLootContainers.push(g);const D=(Math.abs(Math.cos(f))*M.w+Math.abs(Math.sin(f))*M.d)/2,m=(Math.abs(Math.sin(f))*M.w+Math.abs(Math.cos(f))*M.d)/2;e.colliders.push({name:"searchable-loot-container",minX:i-D,maxX:i+D,minY:0,maxY:M.h,minZ:s-m,maxZ:s+m,climbable:!1,ladder:!1})}}function Zo(e){const t=[{label:"\u519B\u68B0\u7BB1",tier:"blue",bias:.04,kind:"armory"},{label:"\u533B\u7597\u67DC",tier:"green",bias:0,kind:"medical"},{label:"\u88C5\u5907\u67B6",tier:"gold",bias:.08,kind:"gearRack"},{label:"\u8865\u7ED9\u5305",tier:"white",bias:0,kind:"supplyBag"},{label:"\u4FDD\u9669\u7BB1",tier:"red",bias:.14,kind:"safe"},{label:"\u5DE5\u5177\u67DC",tier:"green",bias:.02,kind:"toolCabinet"},{label:"\u80CC\u5305\u5806",tier:"blue",bias:.04,kind:"backpackPile"},{label:"\u5BC6\u5C01\u8D27\u7BB1",tier:"gold",bias:.08,kind:"sealedCargo"},{label:"\u6570\u636E\u7BB1",tier:"red",bias:.16,kind:"dataCase"},{label:"\u65E7\u50A8\u7269\u7BB1",tier:"white",bias:0,kind:"oldStorage"},{label:"\u5F39\u6302\u7BB1",tier:"blue",bias:.05,kind:"rigCase"},{label:"\u88C5\u7532\u7BB1",tier:"gold",bias:.08,kind:"armorCase"}],a=e==="bridge"?[[-36,42,.1],[36,-42,1.57],[-18,30,-.2],[18,-30,.35],[-50,20,-.28],[50,-20,1.57],[-56,46,.2],[0,52,0],[62,24,1.57],[-62,-24,-.15],[28,-54,.22],[-28,54,-.25]]:e==="nuclear"?[[-42,-34,.18],[-56,6,1.57],[-12,34,-.18],[22,-34,.42],[45,28,-.35],[56,-16,1.57],[-50,26,.4],[4,-48,0],[62,8,1.57],[-62,-18,-.2],[30,48,-.38],[-28,-52,.25]]:e==="space"?[[-44,-38,.35],[-32,24,1.57],[-58,6,0],[18,-48,-.45],[44,36,.25],[54,-22,1.57],[-50,44,-.3],[4,-58,.08],[62,12,1.57],[-62,-14,.18],[30,54,-.25],[-24,-54,.35]]:[[-44,-30,.1],[-30,18,1.57],[-8,42,-.2],[18,-34,.35],[42,30,-.28],[55,-18,1.57],[-56,24,.2],[0,-52,0],[62,8,1.57],[-62,-8,-.15],[28,54,.22],[-24,-54,-.25]];return t.map((n,r)=>({...n,x:a[r][0],z:a[r][1],rotation:a[r][2]}))}function Ra(e,t,a,n,r){const o=jo(a,r),i=(s,l,d,c,u,f,g="loot-tier-tag")=>p(e,t,s,l,d,c,u,f,o,g);switch(n){case"medical":return p(e,t,0,1,0,1.15,2,.68,a.medPanel,"medical-cabinet-tall-body"),p(e,t,0,2.04,0,1.25,.14,.78,a.darkMetal,"medical-cabinet-top"),p(e,t,0,.1,0,1.25,.2,.78,a.rubber,"medical-cabinet-base"),p(e,t,0,1.18,-.37,.16,.68,.055,a.lootRed,"medical-red-cross-vertical"),p(e,t,0,1.18,-.385,.62,.16,.055,a.lootRed,"medical-red-cross-horizontal"),p(e,t,-.5,1,-.4,.05,1.75,.05,a.darkMetal,"medical-door-line"),i(.45,1.86,-.41,.24,.12,.055),{w:1.35,d:.9,h:2.15};case"gearRack":p(e,t,0,.12,0,2.35,.18,.95,a.darkMetal,"gear-rack-foot");for(const s of[-1.05,1.05])p(e,t,s,.98,0,.12,1.75,.12,a.darkMetal,"gear-rack-upright");p(e,t,0,1.82,0,2.25,.1,.1,a.darkMetal,"gear-rack-top-rail");for(const s of[-.62,0,.62])p(e,t,s,.98,-.08,.46,.88,.12,a.canvas,"hanging-tactical-vest"),p(e,t,s,.94,-.16,.26,.12,.11,o,"hanging-vest-tier-patch");return z(e,t,-.78,1.55,.22,.24,a.darkMetal,"rack-helmet-shell").scale.set(1,.58,.9),i(.88,1.54,.24,.34,.1,.08),{w:2.5,d:1.1,h:1.95};case"supplyBag":b(e,t,0,.45,0,.48,1.55,a.packCanvas,"soft-duffel-main-roll","x"),p(e,t,0,.28,0,1.55,.36,.72,a.packCanvas,"soft-duffel-flat-bottom");for(const s of[-.52,.52])p(e,t,s,.84,-.02,.12,.16,.96,a.rubber,"duffel-black-strap");return p(e,t,0,.62,-.5,1,.22,.08,o,"duffel-front-tier-pocket"),p(e,t,0,.95,0,.72,.1,.18,a.rubber,"duffel-carry-handle"),{w:1.9,d:1.2,h:1.05};case"safe":return p(e,t,0,.78,0,1.38,1.56,1.05,a.darkMetal,"safe-heavy-body"),p(e,t,0,.82,-.56,1.2,1.32,.12,a.metal,"safe-thick-door"),b(e,t,0,.9,-.64,.2,.08,o,"safe-round-dial","z"),b(e,t,.35,.62,-.66,.045,.55,a.warmLight,"safe-horizontal-handle","x"),p(e,t,0,1.62,-.16,1.5,.12,1.15,a.rubber,"safe-rubber-cap"),{w:1.6,d:1.25,h:1.72};case"toolCabinet":p(e,t,0,.9,0,1.28,1.8,.72,a.metal,"tool-cabinet-body");for(let s=0;s<5;s+=1)p(e,t,0,.34+s*.29,-.39,1.08,.19,.08,s%2?a.darkMetal:a.stainedConcrete,"tool-cabinet-drawer"),p(e,t,0,.34+s*.29,-.445,.42,.035,.04,o,"tool-cabinet-drawer-label");return p(e,t,0,1.86,0,1.38,.12,.82,a.darkMetal,"tool-cabinet-top-lip"),{w:1.45,d:.95,h:1.95};case"backpackPile":return _t(e,t,a,-.42,.38,-.1,0,o),_t(e,t,a,.4,.46,.06,.28,o),_t(e,t,a,.03,.95,-.06,-.18,o),p(e,t,0,.08,0,1.9,.16,1.15,a.rubber,"backpack-pile-floor-mat"),{w:2.1,d:1.35,h:1.35};case"sealedCargo":p(e,t,0,.62,0,2.35,1.24,1.28,a.darkMetal,"sealed-cargo-main"),b(e,t,0,1.25,0,.64,2.35,a.metal,"sealed-cargo-rounded-lid","x"),p(e,t,0,1.28,-.66,2.05,.12,.08,o,"sealed-cargo-top-seal");for(const s of[-.82,0,.82])p(e,t,s,.62,-.7,.08,.96,.08,a.rubber,"sealed-cargo-rib");return{w:2.6,d:1.55,h:1.75};case"dataCase":p(e,t,0,.84,0,1.55,1.68,.92,a.darkMetal,"data-case-server-body");for(let s=0;s<4;s+=1)p(e,t,-.36+s*.24,1.18,-.5,.12,.28,.05,s%2?a.warmLight:o,"data-case-lit-module");return p(e,t,0,.58,-.51,1.1,.18,.055,a.glass,"data-case-screen-strip"),b(e,t,.68,1.85,.15,.035,.8,a.darkMetal,"data-case-antenna","y"),z(e,t,.68,2.27,.15,.08,o,"data-case-antenna-light"),{w:1.8,d:1.1,h:2.35};case"oldStorage":for(const[s,l,d,c]of[[-.38,.34,.1,.08],[.45,.35,-.12,-.12],[0,.86,.05,.18]]){const u=p(e,t,s,l,d,.9,.62,.78,a.shelfWood,"old-storage-wood-crate");u.rotation.y=c,p(e,t,s,l+.08,d-.42,.82,.08,.05,a.dirt,"old-storage-front-plank"),p(e,t,s,l-.12,d-.42,.82,.08,.05,a.dirt,"old-storage-front-plank")}return i(0,1.25,-.46,.5,.09,.06),{w:1.8,d:1.25,h:1.35};case"rigCase":p(e,t,0,.38,0,1.95,.76,1.16,a.darkMetal,"rig-case-open-box"),p(e,t,0,.82,.55,1.95,.08,.16,a.metal,"rig-case-back-lid");for(const s of[-.58,0,.58])p(e,t,s,.86,-.2,.42,.38,.18,a.canvas,"rig-pouch-stack"),p(e,t,s,1.08,-.2,.38,.08,.2,o,"rig-pouch-colored-flap");return p(e,t,0,.9,.15,1.38,.12,.16,a.rubber,"rig-case-shoulder-strap"),{w:2.15,d:1.35,h:1.18};case"armorCase":p(e,t,0,.24,0,2,.48,1.16,a.darkMetal,"armor-case-base");for(let s=0;s<4;s+=1){const l=p(e,t,-.48+s*.32,.62+s*.04,-.08+s*.03,.5,.62,.12,s%2?a.stainedConcrete:a.metal,"stacked-armor-plate");l.rotation.z=-.1+s*.05}return p(e,t,.62,.84,-.1,.36,.78,.12,o,"armor-case-tier-plate"),p(e,t,0,.98,.48,1.8,.08,.12,a.rubber,"armor-case-open-lid"),{w:2.15,d:1.35,h:1.25};case"damVault":p(e,t,0,.54,0,2.5,1.08,1.5,a.vaultMetal||a.metal,"dam-vault-pressure-case"),b(e,t,0,1.14,0,.76,2.5,a.metal,"dam-vault-rounded-lid","x"),p(e,t,0,1.3,-.78,2.08,.11,.08,a.lootRed,"dam-vault-red-lock-strip");for(const s of[-.86,-.3,.3,.86])p(e,t,s,.57,-.79,.11,.78,.09,a.metal,"dam-vault-front-rib"),b(e,t,s,1.18,-.82,.075,.16,a.warmLight,"dam-vault-latch","z");return p(e,t,0,.12,0,2.72,.16,1.68,a.rubber,"dam-vault-rubber-base"),{w:2.8,d:1.75,h:1.92};default:p(e,t,0,.42,0,2.25,.84,1.05,a.darkMetal,"armory-long-crate-body"),p(e,t,0,.9,0,2.38,.12,1.15,o,"armory-colored-lid");for(const s of[-.84,-.28,.28,.84])p(e,t,s,.48,-.58,.08,.48,.08,a.metal,"armory-front-rib");p(e,t,0,.52,-.62,.48,.18,.08,a.warmLight,"armory-center-latch");for(const s of[-.48,0,.48])b(e,t,s,1.05,.42,.08,.64,a.metal,"loose-ammo-tube","x");return{w:2.55,d:1.35,h:1.2}}}function _t(e,t,a,n,r,o,i,s){const l=new t.Group;l.position.set(n,r,o),l.rotation.y=i,p(l,t,0,0,0,.72,.62,.46,a.packCanvas,"stacked-backpack-body"),p(l,t,0,.05,-.27,.48,.28,.1,s,"stacked-backpack-front-pocket"),p(l,t,-.32,.03,0,.08,.54,.52,a.rubber,"stacked-backpack-left-strap"),p(l,t,.32,.03,0,.08,.54,.52,a.rubber,"stacked-backpack-right-strap"),e.add(l)}function jo(e,t){return t==="red"?e.lootRed:t==="gold"?e.lootGold:t==="blue"?e.lootBlue:t==="green"?e.lootGreen:e.lootWhite}function Vo(e,t,a){if(!e.group||e.__realismWallDecorDone)return;e.__realismWallDecorDone=!0;const n=Ko(e);for(const o of n.slice(0,10))Qo(e.group,o,t,a);const r=[];e.group.traverse(o=>{const i=(o.name||"").toLowerCase();!o.position||!i.includes("window")&&!i.includes("graffiti")&&!i.includes("poster")||i.includes("street-shop")||i.includes("interactive-shop")||i.includes("fixed-wall")||i.includes("door")||r.push(o)});for(const o of r){const i=Jo(o.position,n);!i||i.score>16||(o.position.x=i.x,o.position.z=i.z,o.rotation&&(o.rotation.y=i.axis==="x"?Math.PI/2:0),o.userData.wallAttached=!0,o.castShadow=!1,o.renderOrder=3)}}function Ko(e){return(e.meshes||[]).filter(t=>{if(!t?.isMesh||!t.geometry?.parameters||!t.position)return!1;const a=(t.name||"").toLowerCase();if(a.includes("window")||a.includes("graffiti")||a.includes("door")||a.includes("boundary"))return!1;const n=t.geometry.parameters,r=(n.width||0)*(t.scale?.x||1),o=(n.height||0)*(t.scale?.y||1),i=(n.depth||0)*(t.scale?.z||1);return o>2.4&&Math.max(r,i)>3.2&&t.position.y+o/2>2.7})}function Qo(e,t,a,n){if(t.__realismFacadeDetailsDone)return;t.__realismFacadeDetailsDone=!0;const r=t.geometry?.parameters||{},o=(r.width||0)*(t.scale?.x||1),i=(r.height||0)*(t.scale?.y||1),s=(r.depth||0)*(t.scale?.z||1);if(i<2.8)return;const l=Math.abs(t.position.x)>=Math.abs(t.position.z)?"x":"z",d=l==="x"?t.position.x<0?1:-1:t.position.z<0?1:-1,c=l==="x"?s:o,u=Math.min(3,Math.max(1,Math.floor(i/1.25))),f=Math.min(4,Math.max(2,Math.floor(c/1.6))),g=t.position.y-i/2;for(let M=0;M<u;M+=1){const D=g+1+M*.78;if(!(D>t.position.y+i/2-.45))for(let m=0;m<f;m+=1){const E=(m-(f-1)/2)*Math.min(1.55,c/(f+.5));De(e,a,t,l,d,E,D,.78,.45,n.glass,"fixed-wall-window"),De(e,a,t,l,d,E,D,.9,.055,n.windowFrame,"fixed-wall-window-frame"),De(e,a,t,l,d,E,D,.055,.52,n.windowFrame,"fixed-wall-window-frame")}}De(e,a,t,l,d,-c*.18,g+.72,1.35,.42,n.graffitiPaint,"fixed-wall-graffiti"),De(e,a,t,l,d,-c*.18,g+.88,1,.08,n.warmLight,"fixed-wall-graffiti-highlight")}function De(e,t,a,n,r,o,i,s,l,d,c){const u=a.geometry?.parameters||{},f=(u.width||0)*(a.scale?.x||1),g=(u.depth||0)*(a.scale?.z||1),D=(.009+(c.includes("frame")||c.includes("highlight")?.006:0))*r;if(n==="x"){const R=a.position.x+r*f/2+D,$=ce(o,-g/2+s/2+.2,g/2-s/2-.2)+a.position.z;return p(e,t,R,i,$,.018,l,s,d,c)}const m=a.position.z+r*g/2+D,E=ce(o,-f/2+s/2+.2,f/2-s/2-.2)+a.position.x;return p(e,t,E,i,m,s,l,.018,d,c)}function Jo(e,t){let a=null;for(const n of t){const r=n.geometry?.parameters||{},o=(r.width||0)*(n.scale?.x||1),i=(r.height||0)*(n.scale?.y||1),s=(r.depth||0)*(n.scale?.z||1),l=n.position.y-i/2,d=n.position.y+i/2,c=e.y<l?l-e.y:e.y>d?e.y-d:0,u=[{axis:"x",sign:-1,x:n.position.x-o/2-.012,z:ce(e.z,n.position.z-s/2+.2,n.position.z+s/2-.2),lateral:Math.max(0,Math.abs(e.z-n.position.z)-s/2),plane:Math.abs(e.x-(n.position.x-o/2))},{axis:"x",sign:1,x:n.position.x+o/2+.012,z:ce(e.z,n.position.z-s/2+.2,n.position.z+s/2-.2),lateral:Math.max(0,Math.abs(e.z-n.position.z)-s/2),plane:Math.abs(e.x-(n.position.x+o/2))},{axis:"z",sign:-1,z:n.position.z-s/2-.012,x:ce(e.x,n.position.x-o/2+.2,n.position.x+o/2-.2),lateral:Math.max(0,Math.abs(e.x-n.position.x)-o/2),plane:Math.abs(e.z-(n.position.z-s/2))},{axis:"z",sign:1,z:n.position.z+s/2+.012,x:ce(e.x,n.position.x-o/2+.2,n.position.x+o/2-.2),lateral:Math.max(0,Math.abs(e.x-n.position.x)-o/2),plane:Math.abs(e.z-(n.position.z+s/2))}];for(const f of u){const g=f.plane+f.lateral*.8+c*.35;(!a||g<a.score)&&(a={...f,score:g})}}return a}function ce(e,t,a){return t>a?(t+a)/2:Math.max(t,Math.min(a,e))}function he(e,t,a,n,r,o,i,s){p(e,t,n,r-.02,o,i+.5,.035,s+.5,a.curb,"paving-curb");const l=Math.floor(s/1.1),d=Math.floor(i/1.4);for(let c=0;c<l;c+=1)for(let u=0;u<d;u+=1){const f=n-i/2+.75+u*1.4+c%2*.35,g=o-s/2+.6+c*1.1,M=p(e,t,f,r,g,1.18,.045,.82,a.brick,"individual-road-brick");M.rotation.y=c%2?.025:-.025}}function To(e,t,a,n,r,o,i){const s=n<0?1:-1,l=n+s*4.36;ei(e,n,r,s,o),ai(e,t,a,n,r,s),p(e,t,l+s*.01,1.55,r+.86,.08,1.35,1.72,a.glass,"street-shop-window"),p(e,t,l+s*.075,2.25,r+.86,.11,.08,1.92,a.windowFrame,"street-shop-window-frame-top"),p(e,t,l+s*.075,.85,r+.86,.11,.08,1.92,a.windowFrame,"street-shop-window-frame-bottom"),p(e,t,l+s*.075,1.55,r-.08,.11,1.45,.08,a.windowFrame,"street-shop-window-frame-left"),p(e,t,l+s*.075,1.55,r+1.8,.11,1.45,.08,a.windowFrame,"street-shop-window-frame-right"),p(e,t,l+s*.085,1.55,r+.86,.12,.06,1.72,a.darkMetal,"street-shop-window-crossbar"),p(e,t,l+s*.085,1.55,r+.86,.12,1.32,.06,a.darkMetal,"street-shop-window-crossbar"),p(e,t,l+s*.08,2.55,r,.16,.44,4.95,i,"street-shop-awning"),b(e,t,l+s*.11,2.31,r-2.45,.22,.72,i,"rounded-awning-left","z"),b(e,t,l+s*.11,2.31,r+2.45,.22,.72,i,"rounded-awning-right","z"),oi(e,t,a,l,r-1.52,s),ni(e,t,a,n,r,s),p(e,t,n,3.64,r,9,.34,5.6,a.darkConcrete,"street-shop-roof");const d=p(e,t,n-2.18,4.17,r,4.85,.2,6.12,a.darkMetal,"street-shop-sloped-roof-left");d.rotation.z=.235;const c=p(e,t,n+2.18,4.17,r,4.85,.2,6.12,a.darkMetal,"street-shop-sloped-roof-right");c.rotation.z=-.235,b(e,t,n,4.72,r,.11,6.22,a.metal,"street-shop-roof-ridge","z"),Y(e,t,o,l+s*.2,3.03,r,s<0?-Math.PI/2:Math.PI/2)}function ei(e,t,a,n,r){e.__realismDestructibleBuildings=e.__realismDestructibleBuildings||[],!e.__realismDestructibleBuildings.some(i=>Math.hypot(i.x-t,i.z-a)<.1)&&e.__realismDestructibleBuildings.push({id:`shop-${Math.round(t*10)}-${Math.round(a*10)}`,label:r,x:t,z:a,facing:n,baseHits:0,collapsed:!1})}function ti(e,t,a){const n=t<0?1:-1,r=t+n*4.28,o=t-n*4.18;C(e,"street-shop-back-wall",o,a,.36,3.48,5.24),C(e,"street-shop-side-wall",t,a-2.58,8.54,3.48,.36),C(e,"street-shop-side-wall",t,a+2.58,8.54,3.48,.36),C(e,"street-shop-front-left-column",r,a-2.38,.42,2.3,.48),C(e,"street-shop-front-right-column",r,a+2.38,.42,2.3,.48),C(e,"street-shop-front-center-pier",r,a-.35,.42,2.1,.38),C(e,"street-shop-window-sill",r,a+.86,.42,.72,1.86,{climbable:!0});const i=t-n*1.05;for(const l of[.35,1.45])C(e,"shop-shelf-frame",i,a+l,.36,1.48,1.12);C(e,"shop-counter",t+n*1.75,a+2.05,.48,.9,1.32,{climbable:!0});const s=(e.group.__realismDoors||[]).find(l=>Math.hypot((l.userData?.interactX||0)-r,(l.userData?.interactZ||0)-(a-1.52))<.2);if(s){const l=C(e,"interactive-shop-door",r,a-1.52,.24,2.05,1.08);l&&(l.closedBounds={minX:l.minX,maxX:l.maxX,minZ:l.minZ,maxZ:l.maxZ},s.userData.collider=l)}}function ai(e,t,a,n,r,o){const i=n+o*4.28,s=n-o*4.18;p(e,t,s,1.74,r,.22,3.48,5.18,a.interiorWall,"street-shop-back-wall"),p(e,t,n,1.74,r-2.58,8.44,3.48,.22,a.interiorWall,"street-shop-side-wall"),p(e,t,n,1.74,r+2.58,8.44,3.48,.22,a.interiorWall,"street-shop-side-wall"),p(e,t,n,.04,r,8.45,.08,5.16,a.interiorFloor,"street-shop-interior-floor"),p(e,t,n,3.42,r,8.45,.14,5.16,a.interiorCeiling,"street-shop-interior-ceiling"),p(e,t,i,2.88,r,.24,.9,5.16,a.shopWall,"street-shop-front-upper-wall"),p(e,t,i,.38,r+.86,.24,.72,1.86,a.shopWall,"street-shop-front-window-sill"),p(e,t,i,1.55,r-2.38,.24,2.3,.42,a.shopWall,"street-shop-front-left-column"),p(e,t,i,1.55,r+2.38,.24,2.3,.42,a.shopWall,"street-shop-front-right-column"),p(e,t,i,1.55,r-.35,.24,2.1,.34,a.shopWall,"street-shop-front-center-pier")}function ni(e,t,a,n,r,o){const i=n-o*1.05;p(e,t,n+o*2.2,.08,r-1.52,2.45,.08,1.36,a.interiorFloor,"shop-door-threshold-floor");for(const s of[.35,1.45])p(e,t,i,.84,r+s,.24,1.48,1.08,a.shelfWood,"shop-shelf-frame"),p(e,t,i+o*.04,1.16,r+s,.09,.09,.96,a.warmLight,"shop-shelf-goods-lit"),p(e,t,i+o*.04,.78,r+s,.09,.09,.96,a.awningBlue,"shop-shelf-goods-blue"),p(e,t,i+o*.04,.42,r+s,.09,.09,.96,a.awningRed,"shop-shelf-goods-red");p(e,t,n+o*1.75,.58,r+2.05,.36,.86,1.25,a.concrete,"shop-counter"),p(e,t,n+o*1.58,1.09,r+2.05,.12,.45,1.05,a.glass,"shop-counter-display-glass"),p(e,t,n+o*.45,3.18,r-1.52,4.8,.08,.16,a.warmLight,"shop-entry-ceiling-light"),ri(e,t,a,n,r,o)}function ri(e,t,a,n,r,o){if(!a.shopInteriorPhoto||!t?.PlaneGeometry)return;const i=new t.Mesh(new t.PlaneGeometry(4.78,3.08),a.shopInteriorPhoto);i.name="shop-interior-photo-backdrop",i.position.set(n-o*4.04,1.76,r),i.rotation.y=o*Math.PI/2,i.castShadow=!1,i.receiveShadow=!1,i.renderOrder=1,e.add(i)}function oi(e,t,a,n,r,o){p(e,t,n-o*.05,.08,r,.64,.09,1.08+.18,a.interiorFloor,"street-shop-doorway-floor-visible"),p(e,t,n-o*.08,2.05/2,r-1.08/2-.12,.48,2.05,.08,a.interiorWall,"street-shop-doorway-left-return"),p(e,t,n-o*.08,2.05/2,r+1.08/2+.12,.48,2.05,.08,a.interiorWall,"street-shop-doorway-right-return"),p(e,t,n+o*.085,2.05+.18,r,.16,.14,1.08+.34,a.windowFrame,"street-shop-door-frame-top"),p(e,t,n+o*.085,2.05/2,r-1.08/2-.09,.16,2.05+.18,.12,a.windowFrame,"street-shop-door-frame-left"),p(e,t,n+o*.085,2.05/2,r+1.08/2+.09,.16,2.05+.18,.12,a.windowFrame,"street-shop-door-frame-right");const l=r-1.08/2,d=new t.Group;return d.name="interactive-shop-door",d.position.set(n+o*.14,0,l),d.userData={open:!1,targetAngle:0,closedAngle:0,openAngle:o*1.36,interactX:n,interactZ:r},p(d,t,0,2.05/2,1.08/2,.1,2.05,1.08,a.doorPaint,"interactive-shop-door-slab"),p(d,t,o*.006,1.42,1.08*.5,.11,.44,.42,a.glass,"interactive-shop-door-window"),p(d,t,o*.012,1.66,1.08*.5,.12,.045,.5,a.windowFrame,"interactive-shop-door-window-frame-top"),p(d,t,o*.012,1.18,1.08*.5,.12,.045,.5,a.windowFrame,"interactive-shop-door-window-frame-bottom"),p(d,t,o*.012,1.42,1.08*.27,.12,.5,.045,a.windowFrame,"interactive-shop-door-window-frame-left"),p(d,t,o*.012,1.42,1.08*.73,.12,.5,.045,a.windowFrame,"interactive-shop-door-window-frame-right"),b(d,t,o*.075,1,1.08*.83,.035,.12,a.warmLight,"interactive-shop-door-handle","x"),Be(d,t),e.add(d),e.__realismDoors=e.__realismDoors||[],e.__realismDoors.push(d),d}function Mt(e,t,a,n,r,o){p(e,t,n,.09,r,.72,.18,o,a.curb,"rounded-road-median"),b(e,t,n,.1,r-o/2,.36,.18,a.curb,"rounded-road-median-end","y"),b(e,t,n,.1,r+o/2,.36,.18,a.curb,"rounded-road-median-end","y")}function ii(e,t,a,n){if(t.__realismSoftEdgesDone)return;t.__realismSoftEdgesDone=!0;const r=t.geometry?.parameters||{},o=(r.width||0)*(t.scale?.x||1),i=(r.height||0)*(t.scale?.y||1),s=(r.depth||0)*(t.scale?.z||1);if(i<.45||Math.max(o,s)<3||t.name==="boundary-wall")return;const l=Math.max(.035,Math.min(.085,i*.075,Math.min(o,s)*.08)),d=t.material||n.concrete,c=t.position.y+i/2+l*.12;if(b(e,a,t.position.x,c,t.position.z-s/2,l,o,d,"rounded-cover-edge","x"),b(e,a,t.position.x,c,t.position.z+s/2,l,o,d,"rounded-cover-edge","x"),b(e,a,t.position.x-o/2,c,t.position.z,l,s,d,"rounded-cover-edge","z"),b(e,a,t.position.x+o/2,c,t.position.z,l,s,d,"rounded-cover-edge","z"),i>=1.1&&Math.min(o,s)>=1.4){const u=t.position.y;for(const f of[-1,1])for(const g of[-1,1])b(e,a,t.position.x+f*o/2,u,t.position.z+g*s/2,l,i,d,"rounded-building-corner","y")}}function St(e,t,a,n,r){b(e,t,n,1.25,r,.18,2.5,a.trunk,"tree-trunk","y").scale.set(1.08,1,.92);for(const[i,s,l,d]of[[-.34,1.72,.05,-.72],[.3,1.82,-.08,.66],[-.08,2,.2,-.2]]){const c=b(e,t,n+i,s,r+l,.07,.78,a.trunk,"tree-branch","y");c.rotation.z=d,c.rotation.x=l*1.4}const o=[[0,2.72,0,1.05,a.leaf],[-.72,2.45,.22,.74,a.leafDark],[.68,2.5,-.22,.8,a.leafLight],[-.18,3.16,-.24,.67,a.leaf],[.2,2.42,.64,.62,a.leafDark]];for(const[i,s,l,d,c]of o)z(e,t,n+i,s,r+l,d,c,"tree-foliage-cluster").scale.set(1.16,.76,1.02)}function si(e,t,a,n){const r=e.group,o=Math.abs(be(`road:${n}`));for(let s=0;s<34;s+=1){const l=-48+(o+s*47)%97,d=-52+(o*3+s*71)%105,c=.55+(o+s*23)%18/10,u=p(r,t,l,.105,d,.026,.012,c,a.grime,"road-surface-crack");if(u.rotation.y=(o+s*31)%120/100-.6,s%3===0){const f=p(r,t,l+.18,.106,d+.12,.018,.011,c*.48,a.grime,"road-surface-crack-fork");f.rotation.y=u.rotation.y+.7}}const i=a.glass.clone?.()||a.glass;i!==a.glass&&(i.opacity=.23,i.roughness=.12,i.color?.setHex?.(4743532));for(const[s,l,d,c]of[[-18,-28,1.35,1.8],[22,16,1.05,1.45],[-38,30,.9,1.7],[35,-40,1.12,1.35]]){const u=b(r,t,s,.112,l,d,.012,i,"road-rain-puddle","y");u.scale.x=c}}function li(e,t,a,n){const r=e.group,o=Math.abs(be(`vegetation:${n}`));for(let s=0;s<58;s+=1){const d=(s%2?-1:1)*(22+(o+s*29)%39),c=-56+(o*5+s*43)%113;ci(r,t,a,d,c,.72+(o+s*17)%36/100)}const i=n==="nuclear"||n==="space"?[[-68,52],[68,-52],[-70,-50],[70,50]]:[[-40,44],[-44,-36],[42,40],[46,-42],[-26,58],[28,-58]];for(const[s,l]of i)St(r,t,a,s,l)}function di(e,t,a,n){const r=e.group,o=Math.abs(be(`perimeter:${n}`)),i=[];for(let s=-6;s<=6;s+=1)i.push([s*12,-78],[s*12,78],[-78,s*12],[78,s*12]);for(let s=0;s<i.length;s+=1){const[l,d]=i[s],c=4.4+(o+s*23)%31/10,u=s%3===0?a.stainedConcrete:s%2?a.leafDark:a.grass,f=z(r,t,l,.7+c*.12,d,c,u,"distant-landscape-hill");f.scale.set(l===-78||l===78?.72:1.55,.48+s%4*.05,d===-78||d===78?.72:1.55),f.castShadow=!1,f.receiveShadow=!0}for(let s=-5;s<=5;s+=1){const l=s*13+(o+s*11)%5,d=s%2?-72:72;St(r,t,a,l,d)}}function ci(e,t,a,n,r,o=1){for(let i=0;i<5;i+=1){const s=Math.PI*2*i/5,l=new t.Mesh(new t.CylinderGeometry(.008,.045,.34*o,5),i%2?a.leafLight:a.grass);l.name="individual-grass-blade",l.position.set(n+Math.cos(s)*.08,.17*o,r+Math.sin(s)*.08),l.rotation.z=Math.cos(s)*.24,l.rotation.x=Math.sin(s)*.24,l.castShadow=!0,l.receiveShadow=!0,e.add(l)}}function pi(e,t,a,n,r,o,i){p(e,t,n,.28,r,o,.56,i,a.concrete,"concrete-planter"),p(e,t,n,.6,r,o-.45,.16,i-.45,a.dirt,"planter-soil");for(let s=0;s<Math.max(4,Math.floor(o/2));s+=1){const l=n-o/2+1+s*1.55;z(e,t,l,.9,r,.42,a.leaf,"planter-shrub").scale.set(1,.55,.85)}}function me(e,t,a,n,r,o,i,s,l){const d=p(e.group,t,a,o/2,n,r,o,i,s,l);return e.meshes.push(d),C(e,l,a,n,r,o,i,{climbable:!0}),d}function za(e,t,a,n,r,o,i,s,l){const d=p(e.group,t,a,o/2,n,r,o,i,s,l);return e.meshes.push(d),C(e,l,a,n,r,o,i),d}function C(e,t,a,n,r,o,i,s={}){if(!e?.colliders)return null;const l={name:t,minX:a-r/2,maxX:a+r/2,minY:0,maxY:o,minZ:n-i/2,maxZ:n+i/2,climbable:!!s.climbable,ladder:!1,underground:!!s.underground};return e.colliders.push(l),l}function ui(e,t,a,n,r){const o=new t.Mesh(new t.CylinderGeometry(.48,.48,1.1,24),a.metal);o.name="detail-cover",o.position.set(n,.55,r),o.castShadow=!0,o.receiveShadow=!0,e.group.add(o),e.meshes.push(o),e.colliders.push({name:"detail-cover",minX:n-.48,maxX:n+.48,minY:0,maxY:1.1,minZ:r-.48,maxZ:r+.48,climbable:!1,ladder:!1}),p(o,t,0,.28,0,1.02,.08,1.02,a.darkMetal,"barrel-band"),p(o,t,0,-.28,0,1.02,.08,1.02,a.darkMetal,"barrel-band")}function fi(e,t,a,n,r){for(let o=-1;o<=1;o+=1)p(e,t,n+o*.62,.15,r,.42,.28,2.2,a.canvas,"wooden-pallet");p(e,t,n,.36,r-.68,2.4,.16,.28,a.dirt,"wooden-pallet-slat"),p(e,t,n,.36,r+.68,2.4,.16,.28,a.dirt,"wooden-pallet-slat")}function Xe(e,t,a,n,r,o,i,s,l){const d=Math.max(3,Math.floor((l==="x"?i:s)/1.15));for(let c=0;c<d;c+=1){const u=(c-(d-1)/2)*1.08,f=new t.Mesh(new t.CylinderGeometry(.28,.32,.92,12),a.sandbag);f.name="realistic-sandbag",f.position.set(n+(l==="x"?u:0),r,o+(l==="z"?u:0)),l==="x"?f.rotation.z=Math.PI/2:f.rotation.x=Math.PI/2,f.castShadow=!0,f.receiveShadow=!0,e.add(f)}}function hi(e,t){let a=!1;for(const n of e.enemyRecords||[]){const r=n.view?.root;!r||r.__realismCharacterVersion===pe||(r.__realismCharacterVersion=pe,mi(r,t,n.enemy||{},e.__realismMats),a=!0)}for(const n of e.targetDummies||[]){const r=n.root;!r||r.__realismCharacterDone||(r.__realismCharacterDone=!0,vi(r,t,e.__realismMats),a=!0)}return a}function mi(e,t,a,n){const r=be(a.id||a.name||"unit"),o=ze[Math.abs(r)%ze.length],i=Pa[a.team]||14540253,s=e.getObjectByName?.("realism-operator-model");s&&e.remove(s),e.traverse(c=>{c.isMesh&&(c.visible=!1)});const l=bi(t,o,i,n,a),d=.98+Math.abs(r>>5)%7/100;l.scale.set(o.body,d,o.body),e.add(l)}function bi(e,t,a,n,r){const o=new e.Group;o.name="realism-operator-model";const i=U(e,{color:t.cloth,roughness:.9,metalness:0,sheen:.34,sheenRoughness:.78,sheenColor:t.cloth}),s=U(e,{color:t.vest,roughness:.73,metalness:.04,clearcoat:.04,clearcoatRoughness:.86}),l=U(e,{color:t.accent,roughness:.58,metalness:.12,clearcoat:.08,clearcoatRoughness:.66}),d=U(e,{color:t.helmet,roughness:.54,metalness:.16,clearcoat:.12,clearcoatRoughness:.72}),c=U(e,{color:t.skin,roughness:.62,metalness:0,clearcoat:.06,clearcoatRoughness:.86}),u=U(e,{color:wi(t.skin,.72),roughness:.7,metalness:0}),f=U(e,{color:a,roughness:.48,metalness:.04,emissive:a,emissiveIntensity:.06}),g=n?.rubber||U(e,{color:1118997,roughness:.76,metalness:.04}),M=n?.darkMetal||U(e,{color:1909287,roughness:.42,metalness:.58}),D=n?.opticGlass||U(e,{color:7049636,roughness:.12,metalness:0,transparent:!0,opacity:.48}),m=S(o,e,0,.73,0,.48,.25,.3,i,"operator-pelvis",.055);m.rotation.x=-.04,N(o,e,0,1.12,0,.27,.38,i,"operator-torso").scale.set(1.06,1,.72),S(o,e,0,1.14,-.255,.51,.52,.12,s,"operator-front-plate",.045),S(o,e,0,1.14,.235,.45,.54,.11,s,"operator-back-plate",.045),N(o,e,0,1.47,0,.09,.08,c,"operator-neck");const R=z(o,e,0,1.68,-.015,.245,c,"operator-head");R.scale.set(.82,1.02,.84),R.userData.hitZone="head",z(o,e,0,1.645,-.225,.045,c,"operator-nose").scale.set(.58,.9,.8),z(o,e,-.105,1.715,-.219,.026,u,"operator-eye-left").scale.set(1.25,.44,.34),z(o,e,.105,1.715,-.219,.026,u,"operator-eye-right").scale.set(1.25,.44,.34),N(o,e,-.112,1.755,-.218,.012,.075,u,"operator-brow-left").rotation.z=Math.PI/2-.08,N(o,e,.112,1.755,-.218,.012,.075,u,"operator-brow-right").rotation.z=Math.PI/2+.08,N(o,e,0,1.57,-.224,.01,.09,u,"operator-mouth").rotation.z=Math.PI/2,z(o,e,-.215,1.68,-.005,.055,c,"operator-ear-left").scale.set(.48,.92,.72),z(o,e,.215,1.68,-.005,.055,c,"operator-ear-right").scale.set(.48,.92,.72),z(o,e,0,1.825,-.005,.285,d,"operator-ballistic-helmet").scale.set(.94,.58,.94),S(o,e,0,1.775,-.235,.38,.055,.08,d,"operator-helmet-brim",.018),S(o,e,0,1.922,-.04,.14,.08,.18,M,"operator-helmet-mount",.018),b(o,e,-.25,1.72,.005,.07,.055,g,"operator-headset-left","x"),b(o,e,.25,1.72,.005,.07,.055,g,"operator-headset-right","x");const B=N(o,e,.22,1.59,-.14,.012,.2,g,"operator-boom-mic");B.rotation.x=1.1,B.rotation.z=.38;for(const _ of[-1,1]){const O=N(o,e,_*.36,1.16,-.04,.105,.32,i,_<0?"operator-upper-arm-left":"operator-upper-arm-right");O.rotation.x=.5,O.rotation.z=_*-.12;const G=N(o,e,_*.31,.93,-.24,.09,.28,i,_<0?"operator-forearm-left":"operator-forearm-right");G.rotation.x=.92,G.rotation.z=_*.08,z(o,e,_*.27,.83,-.39,.1,g,_<0?"operator-glove-left":"operator-glove-right").scale.set(.72,1,.7),S(o,e,_*.405,1.27,-.04,.14,.2,.14,s,"operator-shoulder-armor",.035).rotation.z=_*-.18,S(o,e,_*.43,1.2,-.155,.08,.11,.035,f,"operator-team-patch",.012).rotation.y=_*-.24}for(const _ of[-1,1]){const O=N(o,e,_*.17,.55,0,.13,.34,i,_<0?"operator-thigh-left":"operator-thigh-right");O.scale.z=.9;const G=N(o,e,_*.17,.27,-.01,.105,.3,i,_<0?"operator-shin-left":"operator-shin-right");G.scale.z=.9,S(o,e,_*.17,.45,-.135,.23,.2,.065,s,"operator-knee-pad",.028);const Ie=S(o,e,_*.17,.1,-.085,.24,.19,.42,g,_<0?"operator-boot-left":"operator-boot-right",.04);Ie.rotation.x=-.035;for(let v=0;v<3;v+=1)N(o,e,_*.17,.13+v*.035,-.29,.006,.15,l,"operator-boot-lace").rotation.z=Math.PI/2}N(o,e,-.205,1.2,-.27,.028,.58,g,"operator-strap-left"),N(o,e,.205,1.2,-.27,.028,.58,g,"operator-strap-right"),S(o,e,0,.83,-.22,.53,.09,.12,g,"operator-duty-belt",.025);for(const _ of[-.2,0,.2])S(o,e,_,1,-.345,.145,.25,.075,l,"operator-magazine-pouch",.025);S(o,e,0,1.08,.34,t.build==="engineer"?.48:.42,t.build==="shield"?.72:.58,t.build==="shield"?.14:.2,s,"operator-backpack",.055),gi(o,e,t,{cloth:i,vest:s,accent:l,helmet:d,skin:c,black:g,metal:M,glass:D}),xi(o,e,{black:g,metal:M,accent:l,glass:D});const P=e.CircleGeometry?new e.CircleGeometry(.46,32):new e.CylinderGeometry(.46,.46,.008,32),H=new e.Mesh(P,new e.MeshBasicMaterial({color:0,transparent:!0,opacity:.26,depthWrite:!1}));return H.name="operator-contact-shadow",e.CircleGeometry&&(H.rotation.x=-Math.PI/2),H.position.set(0,.008,.03),o.add(H),o.traverse(_=>{_.isMesh&&(_.visible=!0,_.castShadow=["pelvis","torso","front-plate","head","ballistic-helmet","upper-arm","forearm","thigh","shin","boot","rifle-receiver"].some(O=>_.name.includes(O)),_.receiveShadow=_.name!=="operator-contact-shadow",_.userData={..._.userData||{},...r.id?{enemyId:r.id}:{},team:r.team},(_.name.includes("head")||_.name.includes("helmet")||_.name.includes("face")||_.name.includes("eye"))&&(_.userData.hitZone="head"))}),o}function U(e,t){if(e.MeshPhysicalMaterial)return new e.MeshPhysicalMaterial(t);const{sheen:a,sheenRoughness:n,sheenColor:r,clearcoat:o,clearcoatRoughness:i,...s}=t;return new e.MeshStandardMaterial(s)}function gi(e,t,a,n){const{accent:r,vest:o,black:i,metal:s,glass:l}=n;if(a.build==="assault")b(e,t,-.29,.94,-.35,.045,.24,r,"operator-breaching-charge-a","y"),b(e,t,-.18,.94,-.35,.045,.24,r,"operator-breaching-charge-b","y");else if(a.build==="scout"){const d=S(e,t,-.35,.97,-.27,.13,.25,.05,i,"operator-recon-tablet",.02);d.rotation.z=-.1,S(e,t,-.35,.98,-.301,.09,.17,.012,l,"operator-recon-screen",.004),b(e,t,.19,1.45,.31,.012,.52,s,"operator-radio-antenna","y")}else if(a.build==="shield"){const d=S(e,t,0,1.08,.43,.56,.82,.08,s,"operator-folded-shield",.07);d.rotation.x=.04,S(e,t,0,1.16,.478,.31,.16,.018,l,"operator-shield-viewport",.008)}else if(a.build==="medic"){S(e,t,-.31,.88,-.24,.2,.26,.12,r,"operator-trauma-pouch",.035),S(e,t,.31,.88,-.24,.2,.26,.12,o,"operator-injector-case",.035);for(let d=0;d<3;d+=1)b(e,t,.24+d*.055,1.15,-.36,.018,.18,r,"operator-medical-injector","y")}else if(a.build==="mobility"){if(t.TorusGeometry){const d=new t.Mesh(new t.TorusGeometry(.18,.035,10,28),r);d.name="operator-red-scarf",d.rotation.x=Math.PI/2,d.position.set(0,1.48,0),e.add(d)}else{const d=b(e,t,0,1.48,0,.19,.07,r,"operator-red-scarf","y");d.scale.z=.78}S(e,t,.31,.72,.02,.1,.22,.06,s,"operator-carabiner",.02)}else a.build==="engineer"&&(b(e,t,.34,.77,.08,.16,.11,i,"operator-cable-spool","x"),b(e,t,.34,.77,.08,.11,.13,r,"operator-cable-core","x"),S(e,t,-.32,.78,.08,.16,.34,.12,o,"operator-tool-roll",.035))}function xi(e,t,a){const n=new t.Group;n.name="operator-rifle",n.position.set(0,1.01,-.5),n.rotation.z=-.1,S(n,t,0,0,0,.18,.22,.52,a.metal,"operator-rifle-receiver",.025),S(n,t,0,.015,-.42,.14,.15,.38,a.black,"operator-rifle-handguard",.022),b(n,t,0,.015,-.81,.025,.48,a.metal,"operator-rifle-barrel","z"),b(n,t,0,.015,-1.075,.038,.12,a.metal,"operator-rifle-muzzle","z"),S(n,t,0,-.04,.37,.15,.15,.32,a.black,"operator-rifle-stock",.03);const r=S(n,t,0,-.2,-.07,.11,.31,.15,a.metal,"operator-rifle-magazine",.02);r.rotation.x=-.12,S(n,t,0,.15,-.13,.12,.04,.22,a.metal,"operator-rifle-top-rail",.01),S(n,t,0,.21,-.08,.11,.09,.13,a.black,"operator-rifle-optic",.018),S(n,t,0,.21,-.151,.075,.052,.012,a.glass,"operator-rifle-optic-glass",.004),e.add(n)}function N(e,t,a,n,r,o,i,s,l){const d=t.CapsuleGeometry?new t.CapsuleGeometry(o,i,8,16):new t.CylinderGeometry(o,o,i+o*2,20),c=new t.Mesh(d,s);return c.name=l,c.position.set(a,n,r),c.castShadow=!0,c.receiveShadow=!0,e.add(c),Ye(c)}function S(e,t,a,n,r,o,i,s,l,d,c=.025){const u=yi(t,o,i,s,c),f=new t.Mesh(u,l);return f.name=d,f.position.set(a,n,r),f.castShadow=!0,f.receiveShadow=!0,e.add(f),f}function yi(e,t,a,n,r){if(!e.Shape||!e.ExtrudeGeometry)return new e.BoxGeometry(t,a,n,2,2,2);const o=Math.max(.004,Math.min(r,t*.18,a*.18,n*.18)),i=new e.Shape,s=-t/2,l=t/2,d=-a/2,c=a/2;i.moveTo(s+o,d),i.lineTo(l-o,d),i.quadraticCurveTo(l,d,l,d+o),i.lineTo(l,c-o),i.quadraticCurveTo(l,c,l-o,c),i.lineTo(s+o,c),i.quadraticCurveTo(s,c,s,c-o),i.lineTo(s,d+o),i.quadraticCurveTo(s,d,s+o,d);const u=Math.max(.002,n-o*2),f=new e.ExtrudeGeometry(i,{depth:u,steps:1,bevelEnabled:!0,bevelSegments:2,bevelSize:o,bevelThickness:o,curveSegments:4});return f.translate(0,0,-u/2),f.computeVertexNormals?.(),f}function wi(e,t){const a=Math.max(0,Math.min(255,Math.round((e>>16&255)*t))),n=Math.max(0,Math.min(255,Math.round((e>>8&255)*t))),r=Math.max(0,Math.min(255,Math.round((e&255)*t)));return a<<16|n<<8|r}function vi(e,t,a){e.traverse(n=>{n.isMesh&&(n.material=a.canvas,n.castShadow=!0,n.receiveShadow=!0)}),p(e,t,0,1.05,-.2,.62,.72,.08,a.sandbag,"dummy-fabric-front"),p(e,t,0,.58,-.22,.38,.18,.08,a.darkMetal,"dummy-stand-brace")}function Ue(e,t){const a=e.weaponModel,n=Oe(),r=n.optic?.scopeType==="4x"?"4x":n.optic?"reflex":"bare",o=n.attachments.map(f=>f.id).sort().join(",")||"bare",i=`${pe}:${r}:${te()?.id||"base"}:${o}`;if(!a||a.__realismWeaponDone===i)return;Mi(a),a.__realismWeaponDone=i;const s=e.__realismMats;a.traverse(f=>{f.isMesh&&(f.visible=!1)});const l=new t.Group;l.name="realism-complete-weapon",a.add(l),S(l,t,.42,-.33,-.69,.28,.22,.66,s.darkMetal,"realistic-rifle-receiver",.035),S(l,t,.42,-.315,-1.17,.25,.18,.52,s.rubber,"realistic-rifle-handguard",.04),b(l,t,.42,-.315,-1.66,.038,.66,s.darkMetal,"round-barrel","z"),b(l,t,.42,-.315,-1.36,.105,.055,s.metal,"realistic-gas-block","z"),S(l,t,.42,-.34,-.19,.24,.17,.36,s.rubber,"realistic-rifle-stock",.045),S(l,t,.42,-.18,-.8,.26,.035,.98,s.metal,"continuous-picatinny-rail",.01);for(let f=0;f<9;f+=1)S(l,t,.42,-.15,-1.22+f*.105,.17,.018,.024,s.darkMetal,"rail-tooth",.005);const d=N(l,t,.42,-.53,-.48,.07,.26,s.rubber,"realistic-pistol-grip");d.rotation.x=-.22;const c=n.mag?.47:.36,u=S(l,t,.42,-.53,-.72,.14,c,.17,s.darkMetal,n.mag?"extended-magazine":"slim-magazine",.025);u.rotation.x=-.13,S(l,t,.565,-.3,-.67,.018,.12,.28,s.metal,"ejection-port-detail",.004),b(l,t,.265,-.315,-.74,.018,.16,s.metal,"realistic-charging-handle","x"),r==="4x"?ki(l,t,s):r==="reflex"&&Si(l,t,s),n.muzzle?b(l,t,.42,-.315,-2.03,.066,.22,s.metal,"muzzle-device-round","z"):b(l,t,.42,-.315,-2,.049,.11,s.darkMetal,"bare-muzzle","z"),n.grip&&b(l,t,.42,-.51,-1.16,.055,.28,s.rubber,"foregrip-round","y"),n.laser&&(S(l,t,.25,-.29,-1.2,.075,.1,.3,s.darkMetal,"side-laser-module",.018),z(l,t,.25,-.29,-1.36,.026,s.warmLight,"laser-lens")),n.stock&&S(l,t,.42,-.3,-.04,.29,.2,.22,s.rubber,"tactical-stock-addon",.045),_i(l,t,s)}function _i(e,t,a){const n=x().equipped?.operator||"weicong",r=ze.find(d=>d.id===n)||ze[0],o=U(t,{color:r.cloth,roughness:.92,metalness:0}),i=a.rubber,s=N(e,t,.17,-.57,-1.02,.1,.54,o,"first-person-left-forearm");s.rotation.x=1.18,s.rotation.z=-.16,z(e,t,.29,-.47,-1.22,.105,i,"first-person-left-glove").scale.set(.82,.72,1.08);const l=N(e,t,.72,-.61,-.39,.11,.56,o,"first-person-right-forearm");l.rotation.x=.82,l.rotation.z=.16,z(e,t,.5,-.49,-.5,.11,i,"first-person-right-glove").scale.set(.82,.74,1.02);for(const d of[.23,.27,.31,.35])N(e,t,d,-.43,-1.27,.016,.1,i,"first-person-glove-finger").rotation.x=Math.PI/2}function Mi(e){const t=e.getObjectByName?.("realism-complete-weapon");t&&(t.traverse(n=>n.geometry?.dispose?.()),t.parent?.remove(t));const a=[];e.traverse(n=>{const r=n.name||"";(r.includes("reflex")||r.includes("red-dot")||r.includes("four-x")||r.includes("scope-ring")||r.includes("open-frame-sight")||r.includes("low-reflex-sight-base")||r.includes("frameless-reflex-glass")||r.includes("round-barrel")||r.includes("muzzle-device-round")||r.includes("suppressor-round")||r.includes("foregrip-round")||r.includes("continuous-picatinny-rail")||r.includes("rail-tooth")||r.includes("side-laser-module")||r.includes("laser-lens")||r.includes("slim-magazine")||r.includes("extended-magazine")||r.includes("ejection-port-detail")||r.includes("angled-handguard-pad")||r.includes("foregrip-rubber")||r.includes("tactical-stock-addon"))&&a.push(n)});for(const n of a)n.parent?.remove(n),n.geometry?.dispose?.()}function Si(e,t,a){p(e,t,.42,-.13,-.72,.19,.035,.24,a.darkMetal,"low-reflex-sight-base");const n=p(e,t,.42,-.048,-.73,.24,.17,.018,a.opticGlass,"frameless-reflex-glass");n.rotation.x=-.045,p(e,t,.285,-.045,-.725,.035,.2,.035,a.darkMetal,"open-frame-sight-left"),p(e,t,.555,-.045,-.725,.035,.2,.035,a.darkMetal,"open-frame-sight-right"),p(e,t,.42,.055,-.725,.25,.025,.035,a.darkMetal,"open-frame-sight-top"),z(e,t,.42,-.013,-.746,.01,a.redDot,"red-dot-reticle")}function ki(e,t,a){p(e,t,.42,-.14,-.74,.2,.04,.56,a.darkMetal,"four-x-scope-base"),b(e,t,.42,-.045,-.75,.105,.72,a.darkMetal,"four-x-scope-body","z"),b(e,t,.42,-.045,-1.13,.13,.09,a.metal,"four-x-scope-front-bell","z"),b(e,t,.42,-.045,-.37,.12,.08,a.metal,"four-x-scope-rear-bell","z"),b(e,t,.42,-.045,-.94,.112,.035,a.opticGlass,"four-x-scope-front-glass","z"),b(e,t,.42,-.045,-.51,.098,.03,a.opticGlass,"four-x-scope-rear-glass","z"),p(e,t,.42,.066,-.75,.16,.035,.035,a.darkMetal,"four-x-scope-top-cap"),p(e,t,.42,-.045,-.56,.24,.035,.035,a.darkMetal,"scope-ring-rear"),p(e,t,.42,-.045,-.98,.24,.035,.035,a.darkMetal,"scope-ring-front")}function Ci(e,t){if(!e.camera||!e.__realismMats)return;const a=e.session?.screen==="playing"&&!!pt("laser");let n=e.camera.getObjectByName?.("always-on-purple-laser"),r=e.camera.getObjectByName?.("always-on-purple-laser-beam");if(!a){n&&(n.visible=!1),r&&(r.visible=!1);return}if(!n){const o=[new t.Vector3(.26,-.34,-1.36),new t.Vector3(.26,-.34,-44)],i=new t.BufferGeometry().setFromPoints(o);n=new t.Line(i,e.__realismMats.purpleLaser),n.name="always-on-purple-laser",e.camera.add(n)}r||(r=b(e.camera,t,.26,-.34,-22.5,.012,42,e.__realismMats.purpleBeam,"always-on-purple-laser-beam","z")),n.visible=!0,r.visible=n.visible,n.material&&(n.material.opacity=.68+Math.sin((e.now||0)*9)*.12),r.material&&(r.material.opacity=.34+Math.sin((e.now||0)*9)*.08)}function Ai(e=""){const t=String(e).toLowerCase();return!t||["window","glass","sign","poster","graffiti","outline","photo","glow","light","smoke","seam","ripple","water","grass","leaf","plant","awning","threshold","floor","ceiling"].some(a=>t.includes(a))?!1:["wall","block","building","cover","column","pier","pillar","shelf","counter","door-slab","door-frame","roof","crate","cabinet","safe","case","container","barrel","pallet","planter","tree-trunk","gallery","hangar","gate","bunker","tank","anchor","cliff","hoist"].some(a=>t.includes(a))}function Ye(e){return e&&Ai(e.name)&&(e.userData.blocksBullets=!0),e}function p(e,t,a,n,r,o,i,s,l,d){const c=new t.Mesh(new t.BoxGeometry(o,i,s),l);return c.name=d||"realism-box",c.position.set(a,n,r),c.castShadow=!0,c.receiveShadow=!0,e.add(c),Ye(c)}function z(e,t,a,n,r,o,i,s){const l=new t.Mesh(new t.SphereGeometry(o,24,14),i);return l.name=s||"realism-sphere",l.position.set(a,n,r),l.castShadow=!0,l.receiveShadow=!0,e.add(l),Ye(l)}function b(e,t,a,n,r,o,i,s,l,d="y"){const c=new t.Mesh(new t.CylinderGeometry(o,o,i,24),s);return c.name=l||"realism-cylinder",c.position.set(a,n,r),d==="x"&&(c.rotation.z=Math.PI/2),d==="z"&&(c.rotation.x=Math.PI/2),c.castShadow=!0,c.receiveShadow=!0,e.add(c),Ye(c)}function Y(e,t,a,n,r,o,i){if(!t.CanvasTexture||!t.SpriteMaterial||!t.Sprite){p(e,t,n,r,o,.12,.8,3.6,e.__fallbackSignMaterial||new t.MeshStandardMaterial({color:2236962,roughness:.7}),"shop-sign-fallback");return}const s=document.createElement("canvas");s.width=512,s.height=128;const l=s.getContext("2d");l.fillStyle="#111827",l.fillRect(0,0,s.width,s.height),l.fillStyle="#f8fafc",l.font="700 48px system-ui, sans-serif",l.textAlign="center",l.textBaseline="middle",l.fillText(a,s.width/2,s.height/2),l.strokeStyle="#fbbf24",l.lineWidth=10,l.strokeRect(8,8,s.width-16,s.height-16);const d=new t.CanvasTexture(s),c=new t.SpriteMaterial({map:d,transparent:!0}),u=new t.Sprite(c);u.name=`shop-sign-${a}`,u.position.set(n,r,o),u.rotation.y=i,u.scale.set(4.6,1.15,1),e.add(u)}function be(e){let t=0;for(let a=0;a<e.length;a+=1)t=t*31+e.charCodeAt(a)|0;return t}})();
