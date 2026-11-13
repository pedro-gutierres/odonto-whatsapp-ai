// Read container/frame metadata rather than estimating minutes from file size.
// Unknown/truncated files fail closed and remain available to the human team.
const MPEG_BITRATES_1=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320];
const MPEG_BITRATES_2=[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
const MPEG_SAMPLE_RATES=[44100,48000,32000];
export function audioSeconds(buffer:ArrayBuffer,mime=''):number|null {
  const bytes=new Uint8Array(buffer),v=new DataView(buffer);
  const decoder=new TextDecoder('ascii');
  const tag=(at:number,n:number)=>decoder.decode(bytes.subarray(at,at+n));
  const finish=(n:number)=>Number.isFinite(n)&&n>0?Math.ceil(n):null;
  try {
    if(tag(0,4)==='OggS') {
      let pos=0,last=0,preSkip=0,rate=0;
      while(pos+27<=bytes.length && tag(pos,4)==='OggS') {
        const count=bytes[pos+26],header=27+count;
        if(pos+header>bytes.length)return null;
        let length=0;for(let i=0;i<count;i++)length+=bytes[pos+27+i];
        if(pos+header+length>bytes.length)return null;
        const packet=pos+header;
        if(tag(packet,8)==='OpusHead'){rate=48000;preSkip=v.getUint16(packet+10,true);}
        if(bytes[packet]===1&&tag(packet+1,6)==='vorbis')rate=v.getUint32(packet+12,true);
        const granule=Number(v.getBigUint64(pos+6,true));
        if(granule<Number.MAX_SAFE_INTEGER)last=Math.max(last,granule);
        pos+=header+length;
      }
      return rate?finish((last-preSkip)/rate):null;
    }
    if(tag(0,4)==='RIFF'&&tag(8,4)==='WAVE') {
      let pos=12,rate=0,size=0;
      while(pos+8<=bytes.length){const len=v.getUint32(pos+4,true),id=tag(pos,4);
        if(pos+8+len>bytes.length)return null;
        if(id==='fmt ')rate=v.getUint32(pos+16,true);
        if(id==='data')size+=len;
        pos+=8+len+(len%2);
      }
      return rate?finish(size/rate):null;
    }
    if(tag(0,6)==='#!AMR\n') {
      const lengths=[13,14,16,18,20,21,27,32,6,0,0,0,0,0,0,1];
      let pos=6,frames=0;
      while(pos<bytes.length){const length=lengths[(bytes[pos]>>3)&15];if(!length||pos+length>bytes.length)return null;pos+=length;frames++;}
      return finish(frames*.02);
    }
    if(mime.includes('mp4') || tag(4,4)==='ftyp') {
      const scan=(start:number,end:number):number|null=>{
        let pos=start;
        while(pos+8<=end){let size=v.getUint32(pos),head=8;
          if(size===1){size=Number(v.getBigUint64(pos+8));head=16;}
          if(size===0)size=end-pos;
          if(size<head||pos+size>end)return null;
          const id=tag(pos+4,4),data=pos+head;
          if(id==='mvhd'){const version=bytes[data],offset=data+(version===1?20:12),rate=v.getUint32(offset);
            const duration=version===1?Number(v.getBigUint64(offset+4)):v.getUint32(offset+4);
            return rate?finish(duration/rate):null;
          }
          if(id==='moov'){const result=scan(data,pos+size);if(result!==null)return result;}
          pos+=size;
        }return null;
      };return scan(0,bytes.length);
    }
    // MPEG layer III, including variable bitrate files (sum actual frames).
    let pos=0,seconds=0,frames=0;
    if(tag(0,3)==='ID3')pos=10+((bytes[6]&127)*2097152+(bytes[7]&127)*16384+(bytes[8]&127)*128+(bytes[9]&127))+((bytes[5]&16)?10:0);
    while(pos+4<=bytes.length) {
      if(tag(pos,3)==='TAG'&&bytes.length-pos===128)break;
      const header=v.getUint32(pos),version=(header>>>19)&3,layer=(header>>>17)&3,bitrateIndex=(header>>>12)&15,sampleIndex=(header>>>10)&3;
      if((header>>>21)!==2047||version===1||layer!==1||!bitrateIndex||bitrateIndex===15||sampleIndex===3)return null;
      const bitrate=(version===3?MPEG_BITRATES_1:MPEG_BITRATES_2)[bitrateIndex]*1000;
      const rate=MPEG_SAMPLE_RATES[sampleIndex]/(version===3?1:version===2?2:4);
      const samples=version===3?1152:576,length=Math.floor((version===3?144:72)*bitrate/rate)+((header>>>9)&1);
      if(pos+length>bytes.length)return null;
      seconds+=samples/rate;frames++;pos+=length;
    }
    return frames?finish(seconds):null;
  } catch {return null;}
}
