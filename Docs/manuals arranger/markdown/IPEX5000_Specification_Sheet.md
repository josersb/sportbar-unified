# IPEX5000 Series Specification Sheet

Rev 22031711675 Ridgeline Dr. Toll-Free: 800-530-8998 Colorado Springs, CO 80921 Fax: 719-260-0075 supportlibav@libav.com

IPEX5000 Series Spec Sheet

## Product Overview

### IPEX5001 Encoder

The Digitalinx IP IPEX5001 encodes / transmits HDMI video and audio over a 1 gigabit network infrastructure using JPEG2000 encoding with a variable data rate at an average of 250 Mbps with peak values up to 850Mbps. The IPEX5001 supports video signals up to 4K at 60 Hz 4:2:0 / 8 bit deep color, 4K at 24Hz 4:2:0 / 10 bit deep color for HDR10 support, HDCP 2.2 and multichannel audio support. An analog audio input port embeds analog audio with the video content, such as a DVI video source. An analog audio output port de-embeds stereo 2 channel audio from the HDMI content, while still passing stereo 2 channel audio to the HDMI output. The encoder supports control of 3rd party devices via RS232 and IR. The USB host port connection is for connecting USB host devices such as a computer that is USB 2.0 Full Speed compliant up to 12Mbps that can communicate with client side devices connected to a decoder.

The IPEX5001 supports PoE power and can be powered remotely via PoE network switch eliminating the need for a nearby power outlet.

### IPEX5001-WP-W Encoder

The Digitalinx IP IPEX5001-WP-W encodes / transmits HDMI or VGA video and audio over a 1 gigabit network infrastructure using JPEG2000 encoding with a variable data rate at an average of 250 Mbps with peak values up to 850Mbps. The IPEX5001-WP-W supports video signals up to 4K at 60 Hz 4:2:0 / 8 bit deep color, 4K at 24Hz 4:2:0 / 10 bit deep color for HDR10 support, HDCP 2.2 and multichannel audio support. An analog audio input port embeds analog audio with the video content, such as a DVI video source. The HDMI and VGA inputs on the IPEX5001-WP-W are auto switching and follow the last in / first out method and must be physically connected / disconnected to engage the auto switch. The encoder supports control of 3rd party devices via RS232 and IR. The USB host port connection is for connecting USB host devices such as a computer that is USB 2.0 Full Speed compliant up to 12Mbps that can communicate with client side devices connected to a decoder.

The IPEX5001-WP-W supports PoE power and can be powered remotely via PoE network switch eliminating the need for a nearby power outlet.

### IPEX5001-D Encoder

The Digitalinx IP IPEX5001-D transmits HDMI video and audio over a 1 gigabit network infrastructure using JPEG2000 encoding with a variable data rate at an average of 250 Mbps with peak values up to 850Mbps. The IPEX5001-D is Dante enabled meaning that the encoder can on ramp two channel stereo audio either from the embedded HDMI audio stream or the analog audio 3.5mm input onto a Dante audio network. The multicast video and Dante audio IP streams are integrated into one Ethernet cable simplifying networked audio and video solution into one. An analog audio output port de-embeds stereo 2 channel audio from the HDMI two channel stereo embedded stream, while still passing stereo 2 channel audio to the HDMI output. The IPEX5001-D supports video signals up to 4K at 60 Hz 4:2:0 / 8 bit deep color, 4K at 24Hz 4:2:0 / 10 bit deep color for HDR10 support and HDCP 2.2 support. The encoder supports control of 3rd party devices via RS232 and IR. The USB host port connection is for connecting USB host devices such as a computer that is USB 2.0 Full Speed compliant up to 12Mbps that can communicate with client side devices connected to a decoder.

The IPEX5001-D supports PoE power and can be powered remotely via PoE network switch eliminating the need for a nearby power outlet.

### IPEX5002 Decoder

The Digitalinx IP IPEX5002 receives HDMI video and audio over a 1 gigabit network infrastructure using JPEG2000 encoding from the IPEX5001, IPEX5001-D and IPEX5001-WP-W encoder. The IPEX5002 outputs video signals natively from source or can be scaled to 1080p or 4K at 24/30Hz 4:4:4 with HDR10, HDCP 2.2 and multichannel audio support. An analog audio output port de-embeds stereo 2 channel audio from the HDMI content while still passing stereo 2 channel audio to the HDMI output. Depending on the needs of the installation, multiple IPEX5002 devices can be configured to make a video wall configuration. The decoder supports control of 3rd party devices via RS232 and IR. The USB client port connections are for connecting USB devices such as a keyboard or mouse that is USB 2.0 Full Speed compliant up to 12Mbps that can communicate with a host side device connected to an encoder.

The IPEX5002 supports PoE power and can be powered remotely via PoE network switch eliminating the need for a nearby power outlet.

## Package Contents per Device

### IPEX5001-WP-W

1. Installation Guide
2. (1) Phoenix 2 pin male connector (3.5mm)
3. (1) 2 gang wall plate decora plastic cover with screws
4. (4) Mounting screws
### IPEX5001

1. Installation Guide
2. Power Supply with US, UK, EU, and AU adapters
3. 3-pin Removable Screw Terminal
4. Mounting Ears (2 ea)
5. IR Emitter
6. IR Receiver
### IPEX5001-D

1. Installation Guide
2. Power Supply with US, UK, EU, and AU adapters
3. 3-pin Removable Screw Terminal
4. Mounting Ears (2 ea)
5. IR Emitter
6. IR Receiver
### IPEX5002

1. Installation Guide
2. Power Supply with US, UK, EU, and AU adapters
3. 3-pin Removable Screw Terminal
4. Mounting Ears (2 ea)
5. IR Emitter
6. IR Receiver

## Front and Rear Panels

### IPEX5001 Front Panel

#### 1 2 3 4

|1.|Power indicator|
|---|---|
|2.|Status indicator|
|3.|RS232 Function Switch|
|4.|DIP Switch for ID Modes|

### IPEX5001 Rear Panel

|A B C D|E|F G H|I J K|
|---|---|---|---|
||ANALOG AUDIO|||
|IN|OUT|USB HOST||

|A.|12V DC power input|
|---|---|
|B.|RESET button|
|C.|LAN connection with PoE support|
|D.|Analog audio input|
|E.|Analog audio output|
|F.|RS232 connection|
|G.|USB Host connection|
|H.|HDMI input|
|I.|HDMI output|
|J.|IR input|
|K.|IR output|

### IPEX5001-WP-W Front Panel

|1.|VGA input port|
|---|---|
|2.|Audio input port (embedded with VGA source)|
|3.|HDMI input port|
|4.|Link LED|

- When *SOLID*: encoder is connected to connected to both an active source and decoder
- When *Blinking*: encoder is disconnected from an active source or decoder
- When *OFF*: encoder is powered off or network is down

|5.|Power LED|
|---|---|
||• When SOLID: device is powered on • When OFF: encoder is powered off or network is down|
|6.|Factory reset|
|7.|IR receiver / sensor|
|8.|RS232 control port|
|9.|USB host port|

### IPEX5001-WP-W Rear Panel

1. DC12 DC power input
2. LAN connection with PoE support

### IPEX5001-D Front Panel

|2 1|3 4|
|---|---|
|IPEX5001-D||

|1.|Power indicator|
|---|---|
|2.|Status indicator|
|3.|RS232 Function Switch|
|4.|DIP Switch for ID Modes|

### IPEX5001-D Rear Panel

|A B C|D|E|F G H|I J K|
|---|---|---|---|---|
|||ANALOG AUDIO|||
|LAN / Dante|IN|OUT|USB HOST||

|A.|12V DC power input|
|---|---|
|B.|RESET button|
|C.|LAN / Dante connection with PoE support|
|D.|Analog audio input|
|E.|Analog audio output|
|F.|RS232 connection|
|G.|USB Host connection|
|H.|HDMI input|
|I.|HDMI output|
|J.|IR input|
|K.|IR output|

### IPEX5002 Front Panel

|2 1|3 4|5|
|---|---|---|
|||USB DEVICE|

|1.|Power indicator|
|---|---|
|2.|Status indicator|
|3.|RS232 Function Switch|
|4.|DIP Switch for ID Modes|
|5.|USB ports for keyboard or mouse|

### IPEX5002 Rear Panel

#### A B C D E F G H

|A.|12V DC power input|
|---|---|
|B.|RESET button|
|C.|LAN connection with PoE support|
|D.|Analog audio output|
|E.|RS232 connection|
|F.|HDMI output|
|G.|IR input|
|H.|IR output|

## IPEX5001 Technical Specifications

|Input/Output Connections||
|---|---|
|HDMI Input|One (1) HDMI Type A Receptacle|
|HDMI Output|One (1) HDMI Type A Receptacle|
|LAN|One (1) 8P8C port (Shielded RJ45)|
|Power|One (1) 5.5 mm OD, 2.6 mm ID Threaded Barrel|
|RS232 Port|One (1) 3-pin Removable Terminal Block Connector|
|USB Device|One (1) USB Type B Port|
|Audio Input|One (1) 3.5 mm TRS Receptacle|
|Audio Output|One (1) 3.5 mm TRS Receptacle|
|IR Input|One (1) 3.5 mm TRS Receptacle|
|IR Output|One (1) 3.5 mm TRS Receptacle|
|Reset|One (1) Momentary Push Button|
|Mode|One (1) Two Position Slider Switch|
|DIP|One (1) Four Position DIP Switch|
|Supported Audio, Video and Control||
|Video Resolutions|SMPTE: 480p, 576p, 720p, 1080i, 1080p, 2160p/30 (4:4:4), 2160p/60 (4:2:0) VESA: Resolutions up to 1920x1200 Color Depth: 24, 30, 36 bit|
|Video Compliance|HDMI 1.4 and HDCP 1.4/2.2|
|Embedded Audio|Up to PCM 8 channel, Dolby Digital True HD, DTS-HD Master Audio, Dolby Atmos and DTS-X|
|ARC (Audio Return Channel)|No|
|HEC (HDMI Ethernet Channel)|No|
|CEC (Consumer Electronics Control)|No|
|Supported Baud Rates|2400, 4800, 9600, 19200, 38400, 57600, 115200|
|USB Compliance|USB 2.0 Full Speed up to 12Mbps|
|Streaming Signal Characteristics||
|Maximum Distance (point to point)|100 m (328 ft)|
|Cable Requirements|Category 5e or greater with TIA/EIA-568B crimp pattern|
|Encoding Data Rate|2160p: Average; 250 Mbps 1080p: Average; 150 Mbps|
|Encoding Method|VBR|
|End to End Latency|17-33 ms (1-2 fps)|
|Chassis and Environmental||
|Construction|Black Steel|
|Dimensions (H x W x D)|25 mm x 220 mm x 130.2 mm (0.98in x 8.66 in x 5.13 in)|
|Operating Temperature|0° to +40° C (+32° to +104° F)|
|Operating Humidity|20% to 90%, Non-condensing|
|Storage Temperature|-10° to +60° C (+14° to +140° F)|
|Storage Humidity|20% to 90%, Non-condensing|
|Power and Regulatory||
|Power Input|12V DC 1A or 48V DC PoE (Power over Ethernet)|
|Power over Ethernet (PoE) Compatibility|802.3af Alternative A|
|Power Consumption|6 watts|
|ESD Protection|8kV air, 4kV contact|
|Regulatory|FCC, CE, RoHS|
|Other||
|Warranty|5 years|
|Diagnostic Indicators|Power and Status|
|Included Accessories|Installation Guide, Power Supply with US, UK, EU and AU adapters, 3-pin Removable Screw Terminal, Mounting Ears (2 ea), IR emitter, IR receiver|
|IP Controller|IPEXAR-5000|
|Compatible Decoder|IPEX5002|

Distances and picture quality may be affected by cable grade, cable quality, source and destination equipment, RF and electrical interference, and cable patches.

## IPEX5001-WP-W Technical Specifications

|Input/Output Connections||
|---|---|
|Video Input||
|LAN||
|Power||
|RS232 Port||
|USB Device||
|Audio Input (VGA)||
|Reset||
|Supported Audio, Video and Control||
|Video Resolutions||
|Video Compliance||
|Embedded Audio||
|ARC (Audio Return Channel)||
|HEC (HDMI Ethernet Channel)||
|CEC (Consumer Electronics Control)||
|Supported Baud Rates||
|USB Compliance||
|Streaming Signal Characteristics||
|Maximum Distance (point to point)||
|Cable Requirements||
|Encoding Data Rate||
|Encoding Method||
|End to End Latency||
|Chassis and Environmental||
|Dimensions (H x W x D)||
|Operating Temperature||
|Operating Humidity||
|Storage Temperature||
|Storage Humidity||
|Power and Regulatory||
|Power Input||
|Power over Ethernet (PoE) Compatibility||
|Power Consumption||
|ESD Protection||
|Regulatory||
|Other||
|Warranty||
|Diagnostic Indicators||
|Included Accessories||
|IP Controller||
|Compatible Decoder||

Distances and picture quality may be affected by cable grade, cable quality, source and destination equipment, RF and electrical interference, and cable patches.

||One (1) HDMI (Type A Receptacle), One (1) VGA (DB-15)|
|---|---|
||One (1) 8P8C port (Shielded RJ45) One (1) 2 pin phoenix connector One (1) 3.5mm One (1) USB Type B Port One (1) 3.5 mm TRS Receptacle One (1) Momentary Push Button SMPTE: 480p, 576p, 720p, 1080i, 1080p, 2160p/30 (4:4:4), 2160p/60 (4:2:0) VESA: Resolutions up to 1920x1200 Color Depth: 24, 30, 36 bit HDMI 1.4 and HDCP 1.4/2.2 Up to PCM 8 channel, Dolby Digital True HD, DTS-HD Master Audio, Dolby Atmos and DTS-X|
||No|
||No|
||No 2400, 4800, 9600, 19200, 38400, 57600, 115200 USB 2.0 Full Speed up to 12Mbps 100 m (328 ft) Category 5e or greater with TIA/EIA-568B crimp pattern 2160p: Average; 250 Mbps 1080p: Average; 150 Mbps|
||VBR 17-33 ms (1-2 fps) 105.6 mm x 89 mm x 43.5 mm (4.1in x 3.5 in x 1.7 in) 0° to +40° C (+32° to +104° F) 20% to 90%, Non-condensing -10° to +60° C (+14° to +140° F) 20% to 90%, Non-condensing 12V DC 1A or 48V DC PoE (Power over Ethernet) 802.3af Alternative A 6 watts 8kV air, 4kV contact FCC, CE, RoHS 5 years Power and Status Installation Guide, (1) 2 pin phoenix connector, (1) 2 gang decora wall plate cover with screws, (4) mounting screws IPEXAR-5000 IPEX5002|

## IPEX5001-D Technical Specifications

|Input/Output Connections||
|---|---|
|HDMI Input|One (1) HDMI Type A Receptacle|
|HDMI Output|One (1) HDMI Type A Receptacle|
|LAN|One (1) 8P8C port (Shielded RJ45)|
|Power|One (1) 5.5 mm OD, 2.6 mm ID Threaded Barrel|
|RS232 Port|One (1) 3-pin Removable Terminal Block Connector|
|USB Device|One (1) USB Type B Port|
|Audio Input|One (1) 3.5 mm TRS Receptacle|
|Audio Output|One (1) 3.5 mm TRS Receptacle|
|IR Input|One (1) 3.5 mm TRS Receptacle|
|IR Output|One (1) 3.5 mm TRS Receptacle|
|Reset|One (1) Momentary Push Button|
|Mode|One (1) Two Position Slider Switch|
|DIP|One (1) Four Position DIP Switch|
|Supported Audio, Video and Control||
|Video Resolutions|SMPTE: 480p, 576p, 720p, 1080i, 1080p, 2160p/30 (4:4:4), 2160p/60 (4:2:0) VESA: Resolutions up to 1920x1200 Color Depth: 24, 30, 36 bit|
|Video Compliance|HDMI 1.4 and HDCP 1.4/2.2|
|Embedded Audio|Up to PCM 8 channel, Dolby Digital True HD, DTS-HD Master Audio, Dolby Atmos and DTS-X|
|ARC (Audio Return Channel)|No|
|HEC (HDMI Ethernet Channel)|No|
|CEC (Consumer Electronics Control)|No|
|Supported Baud Rates|2400, 4800, 9600, 19200, 38400, 57600, 115200|
|USB Compliance|USB 2.0 Full Speed up to 12Mbps|
|Streaming Signal Characteristics||
|Maximum Distance (point to point)|100 m (328 ft)|
|Cable Requirements|Category 5e or greater with TIA/EIA-568B crimp pattern|
|Encoding Data Rate|2160p: Average; 250 Mbps 1080p: Average; 150 Mbps|
|Encoding Method|VBR|
|End to End Latency|17-33 ms (1-2 fps)|
|Chassis and Environmental||
|Construction|Black Steel|
|Dimensions (H x W x D)|25 mm x 220 mm x 130.2 mm (0.98in x 8.66 in x 5.13 in)|
|Operating Temperature|0° to +40° C (+32° to +104° F)|
|Operating Humidity|20% to 90%, Non-condensing|
|Storage Temperature|-10° to +60° C (+14° to +140° F)|
|Storage Humidity|20% to 90%, Non-condensing|
|Power and Regulatory||
|Power Input|12V DC 1A or 48V DC PoE (Power over Ethernet)|
|Power over Ethernet (PoE) Compatibility|802.3af Alternative A|
|Power Consumption|6 watts|
|ESD Protection|8kV air, 4kV contact|
|Regulatory|FCC, CE, RoHS|
|Other||
|Warranty|5 years|
|Diagnostic Indicators|Power and Status|
|Included Accessories|Installation Guide, Power Supply with US, UK, EU and AU adapters, 3-pin Removable Screw Terminal, Mounting Ears (2 ea), IR emitter, IR receiver|
|IP Controller|IPEXAR-5000|
|Compatible Decoder|IPEX5002|

Distances and picture quality may be affected by cable grade, cable quality, source and destination equipment, RF and electrical interference, and cable patches.

## IPEX5002 Technical Specifications

|Input/Output Connections||
|---|---|
|HDMI Input||
|HDMI Output||
|LAN||
|Power||
|RS232 Port||
|USB Device||
|Audio Output||
|IR Input||
|IR Output||
|Reset||
|Mode||
|DIP||
|Supported Audio, Video and Control||
|Video Resolutions||
|Video Compliance||
|Embedded Audio||
|ARC (Audio Return Channel)||
|HEC (HDMI Ethernet Channel)||
|CEC (Consumer Electronics Control)||
|Supported Baud Rates||
|USB Compliance||
|Streaming Signal Characteristics||
|Maximum Distance (point to point)||
|Cable Requirements||
|Encoded Data Rate||
|Encoded Method||
|End to End Latency||
|Maximum Video Wall Size||
|Chassis and Environmental||
|Construction||
|Dimensions (H x W x D)||
|Operating Temperature||
|Operating Humidity||
|Storage Temperature||
|Storage Humidity||
|Power and Regulatory||
|Power Input||
|Power over Ethernet (PoE) Compatibility||
|Power Consumption||
|ESD Protection||
|Regulatory||
|Other||
|Warranty||
|Diagnostic Indicators||
|Included Accessories||
|IP Controller||
|Compatible Encoder||

Distances and picture quality may be affected by cable grade, cable quality, source and destination equipment, RF and electrical interference, and cable patches.

||One (1) HDMI Type A Receptacle|
|---|---|
||One (1) HDMI Type A Receptacle One (1) 8P8C port (Shielded RJ45) One (1) 5.5 mm OD, 2.6 mm ID Threaded Barrel One (1) 3-pin Removable Terminal Block Connector Two (2) USB Type A Port One (1) 3.5 mm TRS Receptacle One (1) 3.5 mm TRS Receptacle One (1) 3.5 mm TRS Receptacle One (1) Momentary Push Button One (1) Two Position Slider Switch One (1) Four Position DIP Switch SMPTE: 480p, 576p, 720p, 1080i, 1080p, 2160p/30 (4:4:4) VESA: Resolutions up to 1920x1200 Color Depth: 24, 30, 36 bit HDMI 1.4/2.0 and HDCP 1.4/2.2 Up to PCM 8 channel, Dolby Digital True HD, DTS-HD Master Audio and Dolby Atmos and DTS-X|
||No|
||No|
||Yes 2400, 4800, 9600, 19200, 38400, 57600, 115200 USB 2.0 Full Speed up to 12Mbps 100 m (328 ft) Category 5e or greater with TIA/EIA-568B crimp pattern 2160p: Average; 250 Mbps 1080p: Average; 150 Mbps|
||VBR 17-33 ms (1-2 fps)|
||16x16 Black Steel 25 mm x 220 mm x 130.2 mm (0.98in x 8.66 in x 5.13 in) 0° to +40° C (+32° to +104° F) 20% to 90%, Non-condensing -10° to +60° C (+14° to +140° F) 20% to 90%, Non-condensing 12V DC 1A or 48V DC PoE (Power over Ethernet) 802.3af Alternative B 6 watts 8kV air, 4kV contact FCC, CE, RoHS 5 years Power and Status Installation Guide, Power Supply, 3-pin Removable Screw Terminal, Mounting Ears (2 ea), IR emitter, IR receiver IPEXAR-5000 IPEX5001, IPEX5001-D, IPEX5001-WP-W|

#### Thank you for your purchase.

For Technical Support please call our toll free number at 800-530-8998 or email us at supportlibav@libav.com

www.libav.com

11675 Ridgeline Drive Colorado Springs, Colorado 80921 USA Phone: 719-260-0061 Fax: 719-260-0075 Toll-Free: 800-530-8998
