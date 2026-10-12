import numpy as np, scipy.io.wavfile as w, scipy.signal as s, noisereduce as nr, os
R='/home/claude/swinka/dzwieki/raw/'; O='/home/claude/swinka-repo/swinka/dzwieki/'; os.makedirs(O,exist_ok=True)
cache={}
def load(n):
    if n not in cache:
        sr,x=w.read(R+n+'.wav'); x=x.astype(float)/32768
        # quietest 0.6s window as noise profile
        L=int(.6*sr); hopn=L//4
        e=[np.sqrt(np.mean(x[i:i+L]**2)) for i in range(0,len(x)-L,hopn)]
        i=int(np.argmin(e))*hopn; cache[n]=(sr,x,x[i:i+L])
    return cache[n]
def clip(out,n,a,b,peak_db=-3,hp=150,strength=0.9,gain_tail=True):
    sr,x,noise=load(n); pad=int(.3*sr)
    A=max(0,int(a*sr)-pad); seg=x[A:int(b*sr)+pad]
    if noise is not None and strength>0:
        seg=nr.reduce_noise(y=seg,sr=sr,y_noise=noise,prop_decrease=strength,stationary=True)
    sos=s.butter(4,hp,'hp',fs=sr,output='sos'); seg=s.sosfiltfilt(sos,seg)
    seg=seg[int(a*sr)-A:int(a*sr)-A+int((b-a)*sr)]
    f=int(.012*sr); ramp=np.linspace(0,1,f); seg[:f]*=ramp; seg[-f:]*=ramp[::-1]
    seg*=10**(peak_db/20)/np.abs(seg).max()
    w.write(O+out+'.wav',sr,(seg*32767).astype(np.int16)); return out
C=[('kwik_1','guinea-pigs',62.60,63.14,-3),
   ('kwik_2','guinea-pigs',62.05,62.45,-3),
   ('kwik_3','guinea-pigs',63.30,63.64,-3),
   ('pisk_strachu','angry-guinea-pig',15.86,16.27,-3),
   ('pisk_zlosci','angry-guinea-pig',17.48,17.93,-4),
   ('mruczenie','guinea-pigs',20.88,22.32,-6),
   ('cwierkanie','cute-guinea-pig',33.92,34.34,-5),
   ('chrupanie_1','eating-a-carrot',0.40,0.68,-9),
   ('chrupanie_2','eating-a-carrot',2.46,2.76,-9),
   ('pop','happy-pop-2',0.0,0.25,-8)]
for o,n,a,b,p in C:
    clip(o,n,a,b,p,strength=0 if n in('happy-pop-2',) else (0.6 if 'carrot' in n else 0.9), hp=60 if o=='mruczenie' else 150)
    print(o)
