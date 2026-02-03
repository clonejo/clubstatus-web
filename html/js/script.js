"use strict";

addEventListener('DOMContentLoaded', () => {

const api = "/api";

const statuz = {
    announcements: {}
};

statuz.announcement_edit = function(aid) {
    const action = statuz.announcements[aid];
    document.getElementById("announcement_modify_aid").value = aid;
    document.getElementById("announcement_modify_from").value = moment.unix(action.from).format("L LT")
    document.getElementById("announcement_modify_to"  ).value = moment.unix(action.to  ).format("L LT")
    document.getElementById("announcement_modify_note").value = action.note;
    document.getElementById("announcement_modify_url").value = action.url;
    document.getElementById("announcement_modify_public").checked = action.public;
    document.getElementById("announcement_modify_box").classList.add("open");
};

statuz.announcement_stop = function(aid) {
    const action = statuz.announcements[aid];
    let user = document.getElementById("username").value;
    if (user == "") {
        user = "Hans Acker";
    }
    fetch(api + "/v0", {
        body: JSON.stringify({
            type: "announcement",
            method: "mod",
            user: user,
            aid: aid,
            from: action.from,
            to: "now",
            public: action.public,
            note: action.note,
            url: action.url,
        }),
        method: "PUT"
    }).then(() => statuz.update());
}

statuz.announcement_delete = function(aid) {
    let user = document.getElementById("username").value;
    if (user == "") {
        user = "Hans Acker";
    }
    fetch(api + "/v0", {
        body: JSON.stringify({
            type: "announcement",
            method: "del",
            user: user,
            aid: aid
        }),
        method: "PUT"
    }).then(() => statuz.update());
}

// am/pm -> 24h and short fromNow
moment.locale('en-24h', {
    longDateFormat: {
        L: "YYYY-MM-DD",
        LT: "HH:mm",
        LTS: "HH:mm:ss"
    },
    relativeTime: {
        future: "in %s",
        past:   "%s ago",
        s:  "just now",
        m:  "1min",
        mm: "%dmin",
        h:  "1h",
        hh: "%dh",
        d:  "1d",
        dd: "%dd",
        M:  "1 month",
        MM: "%d months",
        y:  "1 year",
        yy: "%d years"
    }
});

statuz.update_status = async function() {
    const response = await fetch(api + "/v0/status/current");
    const o =  await response.json();
    
    const current_status = document.getElementById("current_status");
    current_status.textContent = o.last.status;
    current_status.dataset.status = o.last.status;
    document.getElementById("current_status_note").textContent = o.last.note;
    if (o.last.note == "") {
        document.getElementById("current_status_note_row").style.display = "none";
    } else {
        document.getElementById("current_status_note_row").style.display = "flex";
    }
    document.getElementById("status_change_note").value = o.last.note;
    const changed = moment.unix(o.changed.time);
    const updated = moment.unix(o.last.time);
    document.getElementById("current_status_changed").textContent =
        changed.calendar() + " by " + o.changed.user + " (" +
        changed.fromNow(true) + ")";
    document.getElementById("current_status_updated").textContent =
        updated.calendar() + " by " + o.last.user + " (" +
        updated.fromNow(true) + ")";
    document.getElementById("status_change_box").classList.remove("loading");
    // .loading is removed from #status_box when both update_status() and update_presence() are done
};

statuz.update_log = async function() {
    const response = await fetch(api + "/v0/status?count=30");
    const o = await response.json();
    
    const log_table = document.querySelector("#log tbody");
    const template = document.getElementById("log_row_template");
    log_table.replaceChildren();
    for (const action of o.actions) {
        const row = template.content.cloneNode(true).firstElementChild;
        const cells = row.getElementsByTagName("td");
        cells[0].textContent = action.id;
        cells[1].textContent =  moment.unix(action.time).format("ddd, YYYY-MM-DD, LT");
        const statusSpan = cells[2].getElementsByTagName("span")[0];
        statusSpan.dataset.status = action.status;
        statusSpan.textContent = action.status;
        cells[3].textContent = "by " + action.user;
        cells[4].textContent = (action.note != "") ?
            '“' + action.note + "”" : "";
        log_table.prepend(row);
    }
    document.getElementById("log_box").classList.remove("loading");
};

statuz.update_presence = async function() {
    const response = await fetch(api + "/v0/presence?id=last");
    const o = await response.json();

    const action = o.actions[0];
    const users = action.users;
    let text;
    if (users.length == 0 && action.anonymous_users < 0.5) {
        text = "nobody";
    } else if (users.length == 0) {
        text = action.anonymous_users.toFixed(1) + ' anonymous hackers';
    } else {
        text = users.map(function(user) {
            // U+202F NARROW NO-BREAK SPACE
            return user.name + " (" + moment.unix(user.since).fromNow(true) + ")";
        }).join(", ");
        text += ', ' + action.anonymous_users.toFixed(1) + ' anonymous hackers';
        text += ', <a href="https://wiki.aachen.ccc.de/doku.php?id=projekte:clubstatus">you?</a>';
    }
    document.getElementById("current_presence").innerHTML = text;
};

statuz.update_announcements = async function() {
    const response = await fetch(api + "/v0/announcement/current");
    const o = await response.json();
    
    const announcements_table = document.querySelector("#announcements tbody");
    const template = document.getElementById("announcement_row_template");
    statuz.announcements = {};
    announcements_table.replaceChildren();
    for (const action of o.actions) {
        statuz.announcements[action.aid] = action;
        const calendarFormats = {
            sameElse: "ddd, YYYY-MM-DD, LT"
        };
        const from = moment.unix(action.from);
        const to = moment.unix(action.to);
        const begun = !from.isAfter();
        const row = template.content.cloneNode(true).firstElementChild;
        if (begun) {
            row.classList.add("begun");
        }
        
        const cells = row.getElementsByTagName("td");
        if (!begun) {
            cells[0].removeChild(cells[0].getElementsByTagName("i")[0]);
        }
        cells[0].lastChild.textContent = " " + from.calendar(null, calendarFormats);
        cells[1].textContent = to.calendar(null, calendarFormats);
        cells[2].textContent = "by " + action.user;
        const noteSpan = cells[3].getElementsByTagName("span")[0];
        if (action.note != "") {
            noteSpan.textContent = "“" + action.note + "”";
        } else {
            cells[3].removeChild(noteSpan);
        }
        const linkIcon = cells[3].getElementsByTagName("a")[0];
        if (action.url) {
            linkIcon.href = action.url;
        } else {
            cells[3].removeChild(linkIcon);
        }
        const publicIcon = cells[3].getElementsByClassName("fa-globe")[0];
        if (!action.public) {
            cells[3].removeChild(publicIcon);
        }
        row.getElementsByClassName("fa-pencil")[0].addEventListener("click", () =>
            statuz.announcement_edit(action.aid));
        const stopIcon = row.getElementsByClassName("fa-stop")[0];
        const trashIcon = row.getElementsByClassName("fa-trash")[0];
        if (begun) {
            stopIcon.addEventListener("click", () =>
                statuz.announcement_stop(action.aid));
            cells[4].removeChild(trashIcon);
        } else {
            trashIcon.addEventListener("click", () =>
                statuz.announcement_delete(action.aid));
            cells[4].removeChild(stopIcon);
        }
        announcements_table.appendChild(row);
    }
    if (o.actions.length == 0) {
        const row = '<tr><td colspan="6">no current or upcoming announcements</td></tr>';
        announcements_table.innerHTML = row;
    }
    document.getElementById("announcement_box").classList.remove("loading");
};

statuz.update = function() {
    console.log("updating");
    for (const item of document.getElementsByClassName("data-box")) {
        item.classList.add("loading");
    }

    const requests = [
        statuz.update_status(),
        statuz.update_log(),
        statuz.update_presence(),
        statuz.update_announcements()
    ];

    Promise.allSettled([requests[0], requests[2]]).then(() =>
        document.getElementById("status_box").classList.remove("loading"));
};

const status_change = function(status) {
    document.getElementById("status_change_box").style.visibility = "hidden";
    let user = document.getElementById("username").value;
    if (user == "") {
        user = "Hans Acker";
    }
    const note = document.getElementById("status_change_note").value;
    fetch(api + "/v0", {
        body: JSON.stringify({
            type: "status",
            user: user,
            status: status,
            note: note
        }),
        method: "PUT"
    }).then(() => {
        statuz.update();
        document.getElementById("status_change_box").style.visibility = "visible";
    });
};


const from_to_examples = [
    ["now", "23:42"],
    ["20", "23:42"],
    ["20:30", "21:30"],
    ["04.05. 12:00", "15"],
    ["1901-12-13 20:45", "2038-01-19 03:14"],
    ["01.02.2023 17:00", "01:00"],
    ["01.02.18 05:00", "7"]
];
const example_no = Math.floor(Math.random() * from_to_examples.length);
document.getElementById("announcement_add_from").placeholder = "ex: " + from_to_examples[example_no][0];
document.getElementById("announcement_add_to"  ).placeholder = "ex: " + from_to_examples[example_no][1];
const parse_dates = (from_str, to_str) => {
    from_str = from_str.trim();
    to_str   = to_str.trim();
    const from_date_included = from_str.indexOf(" ") > -1;
    const to_date_included   = to_str.indexOf(" ") > -1;
    const formats = [
        "H",
        "H:mm",
        "D.M. H:mm",
        "D.M.YY H:mm",
        "D.M.YYYY H:mm",
        "YYYY-M-D H:mm"
    ];
    const now  = moment();
    let from;
    if (from_str == "now" || from_str == "") {
        from = moment();
    } else {
        from = moment(from_str, formats);
    }
    let to;
    if (to_str == "now" || to_str == "") {
        to = moment();
    } else {
        to = moment(to_str, formats);
    }
    if (!from_date_included && from.isBefore(now)) {
        from.add(1, "days");
    }
    if (!to_date_included) {
        to.date(from.date());
        to.month(from.month());
        to.year(from.year());
        if (to.isBefore(from)) {
            to.add(1, "days");
        }
    }
    let from_ret = parseInt(from.format("X"), 10);
    let to_ret   = parseInt(to.format("X")  , 10);
    if (from_str == "now" || from_str == "") {
        from_ret = "now";
    }
    if (to_str == "now" || to_str == "") {
        to_ret = "now";
    }
    return [from_ret, to_ret];
}

const announcement_add = () => {
    document.getElementById("announcement_add_box").style.visibility = "hidden";
    let user = document.getElementById("username").value;
    if (user == "") {
        user = "Hans Acker";
    }
    const note = document.getElementById("announcement_add_note").value;
    const url = document.getElementById("announcement_add_url").value || null;
    const time_range = parse_dates(
        document.getElementById("announcement_add_from").value,
        document.getElementById("announcement_add_to").value);
    const public_ = document.getElementById("announcement_add_public").checked;
    fetch(api + "/v0", {
        body: JSON.stringify({
            type: "announcement",
            method: "new",
            user: user,
            from: time_range[0],
            to: time_range[1],
            public: public_,
            note: note,
            url: url,
        }),
        method: "PUT",
    }).then(() => {
        statuz.update();
        document.querySelector("#announcement_add_box input[type=text]").value = "";
        document.getElementById("announcement_add_public").checked = false;
        document.getElementById("announcement_add_box").style.visibility = "visible";
    });
};

const announcement_modify = () => {
    document.getElementById("announcement_modify_box").classList.remove("open");
    let user = document.getElementById("username").value;
    if (user == "") {
        user = "Hans Acker";
    }
    const note = document.getElementById("announcement_modify_note").value;
    const url = document.getElementById("announcement_modify_url").value || null;
    const time_range = parse_dates(
        document.getElementById("announcement_modify_from").value,
        document.getElementById("announcement_modify_to").value);
    const aid = parseInt(document.getElementById("announcement_modify_aid").value, 10);
    const public_ = document.getElementById("announcement_modify_public").checked;
    fetch(api + "/v0", {
        body: JSON.stringify({
            type: "announcement",
            method: "mod",
            aid: aid,
            user: user,
            from: time_range[0],
            to: time_range[1],
            public: public_,
            note: note,
            url: url,
        }),
        method: "PUT",
    }).then(() => statuz.update());
};

// debug:
document.querySelector("#header h1").addEventListener("click", () => statuz.update());

document.getElementById("status_change_public" ).addEventListener("click", () => status_change("public" ));
document.getElementById("status_change_private").addEventListener("click", () => status_change("private"));
document.getElementById("status_change_closed" ).addEventListener("click", () => status_change("closed" ));

document.getElementById("status_change_note_clear").addEventListener("click",
    () => document.getElementById("status_change_note").value = "");

document.getElementById("announcement_add_submit").addEventListener("click", () => announcement_add());
document.getElementById("announcement_modify_submit").addEventListener("click", () => announcement_modify());
document.getElementById("announcement_modify_cancel").addEventListener("click", () =>
    document.getElementById("announcement_modify_box").classList.remove("open"));

const linkToLocalStorage = (key, id) => {
    const inputElem = document.getElementById(id);
    inputElem.value = localStorage.getItem(key);
    inputElem.addEventListener("focusout", () =>
        localStorage.setItem(key, inputElem.value));
};
const linkToLocalStorageCheckbox = (key, id) => {
    const inputElem = document.getElementById(id);
    inputElem.checked = JSON.parse(localStorage.getItem(key));
    inputElem.addEventListener("change", () => {
        localStorage.setItem(key, inputElem.checked);
    });
};

linkToLocalStorage("username", "username");
linkToLocalStorageCheckbox("auto_refresh", "auto_refresh");
linkToLocalStorageCheckbox("refresh_on_tab_visible", "refresh_on_tab_visible");

let auto_refresher;
const update_auto_refresh = () => {
    clearInterval(auto_refresher);
    if (JSON.parse(localStorage.getItem("auto_refresh"))) {
        auto_refresher = setInterval(statuz.update, 5*60*1000);
    }
};
document.getElementById("auto_refresh").addEventListener("change", update_auto_refresh);
update_auto_refresh();

const visibilitychange = function() {
    if (!document.hidden){
        statuz.update();
    }
}
const update_refresh_on_tab_visible = () => {
    if (JSON.parse(localStorage.getItem("refresh_on_tab_visible"))) {
        document.addEventListener("visibilitychange", visibilitychange);
    } else {
        document.removeEventListener("visibilitychange", visibilitychange);
    }
}
document.getElementById("refresh_on_tab_visible").addEventListener("change", update_refresh_on_tab_visible);
update_refresh_on_tab_visible();

const toggleFullScreen = () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
}
document.getElementById("fullscreen").addEventListener("click", toggleFullScreen);

statuz.update();
});
