const video_ratio = 4 / 3;

// return the biggest possible widths for videos with 4/3 ration (video_ratio)
// that fit in the available width and height
function calcHeight(width, height, participants) {
    let max_area = 0
    let max_vw = 0
    let vidw = 0;
    let vidh = 0;

    for (let rows = 1; rows<=participants; rows++) {
        vidw = width / Math.ceil(participants/rows);

        if ((vidw*(1/video_ratio)) > (height/rows)) {
            vidh = height/rows;
            vidw = video_ratio * vidh;
        } else {
            vidh = (1/video_ratio) * vidw;
        }

        if (vidh*vidw>max_area) {
            max_area = vidh*vidw;
            max_vw =vidw;
        }
    }

    return max_vw;
}

export function resizeVideos(document, container, style) {
    // container height does not always calculate right so we calculate it
    // manually (probably an issue with my css)
    let container_height = document.body.clientHeight - navbar.clientHeight;
    let container_width = container.clientWidth;

    // get number of visible participants
    let participants = document.getElementsByClassName("participant");
    let participants_arr = [].slice.call(participants);
    let video_participants = participants_arr.filter(e => !e.hidden && !e.classList.contains("participantHidden")).length;

    let participant_width = calcHeight(container_width, container_height, video_participants);
    style.innerHTML = "video { width: " + participant_width + "px; height: " + participant_width * 3/4 + "px; }";
}

export function zoomTrack(trackElement, document, container, style) {
    if (!trackElement.classList.contains('trackZoomed')) {
        // zoom in
        container.childNodes.forEach(participant => {
            if (participant.classList && participant.classList.contains('participant')) {
                let zoomed = false;
                participant.childNodes[0].childNodes.forEach(track => {
                    if (track === trackElement) {
                        track.classList.add('trackZoomed')
                        zoomed = true;
                    }
                });
                if (zoomed) {
                    participant.classList.add('participantZoomed');
                }
                else {
                    participant.classList.add('participantHidden');
                }
            }
        });
    }
    else {
        // zoom out
        container.childNodes.forEach(participant => {
            if (participant.classList && participant.classList.contains('participant')) {
                participant.childNodes[0].childNodes.forEach(track => {
                    if (track === trackElement) {
                        track.classList.remove('trackZoomed');
                    }
                });
                participant.classList.remove('participantZoomed')
                participant.classList.remove('participantHidden')
            }
        });
    }
    resizeVideos(document, container, style);
};
