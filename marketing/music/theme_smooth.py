# "Peekaboo Post Theme" — original composition, synthesized from scratch (no samples).
import numpy as np
from scipy.signal import fftconvolve, butter, lfilter
from scipy.io import wavfile
SR=44100; BPM=112; B=60/BPM
rng=np.random.default_rng(7)
def hz(n): return 440*2**((n-69)/12)
NOTE={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def m(s):  # 'E5' -> midi
    return 12*(int(s[-1])+1)+NOTE[s[0]]+(1 if '#' in s else 0)
def pluck(f,dur,amp=1.0,bright=0.5):
    n=int(SR*dur); N=max(2,int(SR/f))
    buf=rng.uniform(-1,1,N)
    # warm, nylon-string excitation: strongly low-passed noise
    bb,aa=butter(2,min(0.99,1800/(SR/2)),'low'); buf=lfilter(bb,aa,np.tile(buf,3))[-N:]
    buf/=np.max(np.abs(buf))+1e-9
    out=np.zeros(n); b=list(buf); idx=0; prev=0.0
    decay=0.994
    for i in range(n):
        v=b[idx]; nv=decay*0.5*(v+prev); prev=v
        b[idx]=nv; out[i]=v; idx=(idx+1)%N
    env=np.minimum(1,np.arange(n)/180)
    return amp*out*env
def bell(f,dur,amp=1.0):
    t=np.arange(int(SR*dur))/SR
    s=(np.sin(2*np.pi*f*t)*np.exp(-t*2.6)+0.18*np.sin(2*np.pi*f*2*t)*np.exp(-t*5)+0.05*np.sin(2*np.pi*f*3*t)*np.exp(-t*9))
    s*=np.minimum(1,np.arange(len(t))/400)
    return amp*s
def bass(f,dur,amp=1.0):
    t=np.arange(int(SR*dur))/SR
    return amp*(np.sin(2*np.pi*f*t)+0.2*np.sin(4*np.pi*f*t))*np.exp(-t*2.5)*np.minimum(1,np.arange(len(t))/200)
def shaker(dur,amp=1.0):
    n=int(SR*dur); x=rng.uniform(-1,1,n)
    bb,aa=butter(2,[5000/(SR/2),9000/(SR/2)],'band'); x=lfilter(bb,aa,x)
    return amp*x*np.exp(-np.arange(n)/SR*40)
BARS=16; total=int(SR*(BARS*4*B+2.5)); mix=np.zeros(total); glk=np.zeros(total)
def add(buf,sig,t):
    i=int(t*SR); j=min(len(buf),i+len(sig)); buf[i:j]+=sig[:j-i]
chords=[['C4','E4','G4','C5'],['A3','E4','A4','C5'],['F3','C4','F4','A4'],['G3','D4','G4','B4']]
roots=['C3','A2','F2','G2']
# ukulele-style strum pattern: D . D U . U D U (8ths)
pattern=[(0,1.0,'d'),(1,0.7,'d'),(2,0.85,'d'),(2.5,0.4,'u'),(3,0.7,'d')]
for bar in range(BARS):
    c=chords[bar%4]; t0=bar*4*B
    for beat,a,dirn in pattern:
        notes=c if dirn=='d' else c[::-1]
        for k,nn in enumerate(notes):
            add(mix,pluck(hz(m(nn)),B*1.8,0.13*a),t0+beat*B+k*0.018)
    add(mix,bass(hz(m(roots[bar%4])),B*1.9,0.20),t0)
    add(mix,bass(hz(m(roots[bar%4])),B*1.9,0.15),t0+2*B)
    if bar>=1:
        for e in range(8): add(mix,shaker(0.10,0.018 if e%2 else 0.028),t0+e*B/2)
# Original melody (8 bars), played twice; second time with a sparkle arpeggio.
mel=[[('E5',1),('G5',1),('A5',1),('G5',1)],[('E5',1),('C5',1),('D5',1),('E5',1)],
     [('F5',1),('A5',1),('C6',1),('A5',1)],[('G5',1.5),('F5',.5),('E5',1),('D5',1)],
     [('E5',1),('G5',1),('C6',1),('B5',1)],[('A5',1),('G5',1),('E5',1),('C5',1)],
     [('D5',1),('F5',1),('A5',1),('G5',1)],[('G5',1),('B5',1),('C6',2)]]
for rep in range(2):
    for bi,bar in enumerate(mel):
        t=(rep*8+bi)*4*B
        for nn,d in bar:
            add(glk,bell(hz(m(nn)),max(1.4,d*B*1.8),0.24),t); t+=d*B
    if rep==1:
        for bi in range(8):
            c=chords[bi%4]; t0=(8+bi)*4*B
            for k in range(8): add(glk,bell(hz(m(c[k%4])+12),0.5,0.06),t0+k*B/2+B/4)
mix+=glk
def pad(freqs,dur,amp):
    tt=np.arange(int(SR*dur))/SR
    s=sum(np.sin(2*np.pi*f*tt+ k)+0.3*np.sin(2*np.pi*f*1.003*tt) for k,f in enumerate(freqs))
    env=np.minimum(1,tt/0.6)*np.minimum(1,(dur-tt)/0.6)
    return amp*s*env/len(freqs)
for bar in range(BARS):
    add(mix,pad([hz(m(n)) for n in chords[bar%4][:3]],4*B+0.3,0.07),bar*4*B)
# small room reverb
ir_t=np.arange(int(SR*1.8))/SR; ir=rng.normal(0,1,len(ir_t))*np.exp(-ir_t*3.2); bb,aa=butter(2,5000/(SR/2),'low'); ir=lfilter(bb,aa,ir); ir/=np.abs(ir).sum()/6
wet=fftconvolve(mix,ir)[:len(mix)]
out=0.78*mix+0.35*wet
# gentle limiter + fades
out/=np.max(np.abs(out))/0.89
fade=int(SR*2.0); out[-fade:]*=np.linspace(1,0,fade); out[:2000]*=np.linspace(0,1,2000)
st=np.stack([out, np.roll(out,int(SR*0.008))*0.98],axis=1)
wavfile.write('theme-raw.wav',SR,(st*32767).astype(np.int16))
print('seconds',len(out)/SR,'peak',np.max(np.abs(st)))
