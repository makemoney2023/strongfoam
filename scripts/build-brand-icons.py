# OG image + favicons for Strong Foam. Logo raster: render assets/brand/strongfoam-logo.svg to /tmp/sf-logo.png first.
from PIL import Image, ImageDraw, ImageFont, ImageOps
INK=(11,18,24); CYAN=(0,158,226); RED=(232,4,61); WHITE=(255,255,255)
G="/usr/share/fonts/truetype/sand-box/"
black=G+"google/Archivo Black/ArchivoBlack-Regular.ttf"; semi=G+"custom/Source Sans Pro/SourceSansPro-Semibold.ttf"; reg=G+"custom/Source Sans Pro/SourceSansPro-Regular.ttf"
logo=Image.open("/tmp/sf-logo.png").convert("RGBA"); logo=logo.crop(logo.getbbox())
W,H=1200,630
photo=ImageOps.fit(Image.open("public/media/heroes/spray-foam-poster.jpg").convert("RGB"),(W,H),Image.LANCZOS)
grad=Image.new("L",(W,1)); [grad.putpixel((x,0),int(250-150*max(0,(x-380)/820))) for x in range(W)]
og=Image.composite(Image.new("RGB",(W,H),INK),photo,grad.resize((W,H)))
d=ImageDraw.Draw(og)
lw=440; l=logo.resize((lw,int(logo.height*lw/logo.width)),Image.LANCZOS); og.paste(l,(72,80),l)
y=80+l.height+56; d.rectangle([72,y,136,y+5],fill=RED); y+=28
f=ImageFont.truetype(black,54)
for line in ["Commercial Spray Foam &","Fire Protection in Ontario"]: d.text((72,y),line,font=f,fill=WHITE); y+=66
d.text((72,y+14),"Spray Foam · Fireproofing · Intumescent · AVB · Firestopping",font=ImageFont.truetype(semi,27),fill=CYAN)
d.text((72,H-70),"strongfoam.com",font=ImageFont.truetype(reg,28),fill=(200,210,225))
og.save("public/og-image.png",optimize=True)
def icon(sz,radius=0.18):
    im=Image.new("RGBA",(sz,sz),(0,0,0,0)); dr=ImageDraw.Draw(im)
    dr.rounded_rectangle([0,0,sz-1,sz-1],radius=int(sz*radius),fill=INK+(255,))
    fnt=ImageFont.truetype(black,int(sz*0.56))
    ws=dr.textlength("S",font=fnt); wf=dr.textlength("F",font=fnt)
    bb=dr.textbbox((0,0),"SF",font=fnt); x=(sz-(ws+wf))/2; yy=(sz-(bb[3]-bb[1]))/2-bb[1]
    dr.text((x,yy),"S",font=fnt,fill=CYAN); dr.text((x+ws,yy),"F",font=fnt,fill=RED); return im
icon(512).save("public/icon.png"); icon(180,0).convert("RGB").save("public/apple-icon.png")
icon(32).save("public/favicon-32x32.png"); icon(256).save("public/favicon.ico",sizes=[(16,16),(32,32),(48,48),(64,64)])
