"use strict";

var api = "/api";

var statuz = {
    announcements: {}
};
statuz.announcement_edit = function(aid) {
    var action = statuz.announcements[aid];
    $("#announcement_modify_aid").val(aid);
    $("#announcement_modify_from").val(moment.unix(action.from).format("L LT"));
    $("#announcement_modify_to"  ).val(moment.unix(action.to  ).format("L LT"));
    $("#announcement_modify_note").val(action.note);
    $("#announcement_modify_public").prop("checked", action.public);
    $("#announcement_modify_box").slideDown();
};

statuz.announcement_stop = function(aid) {
    var action = statuz.announcements[aid];
    var user = $("#username").val();
    if (user == "") {
        user = "Hans Acker";
    }
    $.ajax(api + "/v0", {
        data: JSON.stringify({
            type: "announcement",
            method: "mod",
            user: user,
            aid: aid,
            from: action.from,
            to: "now",
            public: action.public
        }),
        method: "PUT",
        success: function(res, status, jqxhr) {
            statuz.update();
        }
    });
}

statuz.announcement_delete = function(aid) {
    var user = $("#username").val();
    if (user == "") {
        user = "Hans Acker";
    }
    $.ajax(api + "/v0", {
        data: JSON.stringify({
            type: "announcement",
            method: "del",
            user: user,
            aid: aid
        }),
        method: "PUT",
        success: function(res, status, jqxhr) {
            statuz.update();
        }
    });
}

$(document).ready(function() {

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

statuz.update_status = function() {
    $.getJSON(api + "/v0/status/current", function(o) {
        var current_status = $("#current_status");
        current_status.text(o.last.status);
        if (o.last.status === "closed") {
            current_status.removeClass();
            current_status.addClass("closed");
        } else if (o.last.status === "private") {
            current_status.removeClass();
            current_status.addClass("private");
        } else if (o.last.status === "public") {
            current_status.removeClass();
            current_status.addClass("public");
        }
        $("#current_status_note").text(o.last.note);
        if (o.last.note == "") {
            $("#current_status_note_row").css("display", "none");
        } else {
            $("#current_status_note_row").css("display", "flex");
        }
        $("#status_change_note").val(o.last.note);
        var changed = moment.unix(o.changed.time);
        var updated = moment.unix(o.last.time);
        $("#current_status_changed").text(changed.calendar() + " by " + o.changed.user
                + " (" + changed.fromNow(true) + ")");
        $("#current_status_updated").text(updated.calendar() + " by " + o.last.user
                + " (" + updated.fromNow(true) + ")");
        $("#status_change_box").removeClass("loading");
        // .loading is removed from #status_box when both update_status() and update_presence() are done
    });
};

statuz.update_log = function() {
    $.getJSON(api + "/v0/status?count=30", function(o) {
        var log_table = $("#log tbody");
        log_table.empty();
        $.each(o.actions, function(index, action) {
            var row = '<tr>';
            row += "<td>" + action.id + "</td>";
            row += "<td>" + moment.unix(action.time).format("ddd, YYYY-MM-DD, LT") + "</td>";
            row += '<td><span class="status status_' + action.status + '">'
                + action.status + "</span></td>";
            row += "<td>by " + $("<div />").text(action.user).html() + "</td>";
            row += '<td class="note">';
            if (action.note != "") {
                row += '“' + $("<div/>").text(action.note).html() + "”";
            }
            row += '</td>';
            row += "</tr>";
            log_table.prepend(row);
        });
        $("#log_box").removeClass("loading");
    })
};

statuz.update_presence = function() {
    $.getJSON(api + "/v0/presence?id=last", function(o) {
        var current_presence = $("#current_presence");
        var users = o.actions[0].users;
        if (users.length == 0) {
            current_presence.text("nobody");
        } else {
            current_presence.text(users.map(function(user) {
                return user.name + "&nbsp;(" + moment.unix(user.since).fromNow(true) + ")";
            }).join(", "));
        }
    });
};

statuz.update_announcements = function() {
    $.getJSON(api + "/v0/announcement/current", function(o) {
        var announcements_table = $("#announcements tbody");
        statuz.announcements = {};
        announcements_table.empty();
        $.each(o.actions, function(index, action) {
            statuz.announcements[action.aid] = action;
            var calendarFormats = {
                sameElse: "ddd, YYYY-MM-DD, LT"
            };
            var from = moment.unix(action.from);
            var to = moment.unix(action.to);
            var begun = !from.isAfter();
            if (begun) {
                var row = '<tr class="begun">';
            } else {
                var row = '<tr>';
            }
            row += "<td>" + action.aid + "</td>";
            row += '<td>';
            if (begun) {
                row += '<i class="fa fa-play"></i> ';
            }
            row += from.calendar(null, calendarFormats) + "</td>";
            row += "<td>" + to.calendar(null, calendarFormats) + "</td>";
            row += "<td>by " + $("<div />").text(action.user).html() + "</td>";
            row += '<td class="note">';
            if (action.note != "") {
                row += '“' + $("<div/>").text(action.note).html() + "”";
            }
            row += '</td>';
            if (action.public) {
                row += '<td><i class="fa fa-check"></i></td>';
            } else {
                row += "<td>&nbsp;</td>";
            }
            row += '<td class="actions">';
            row += '<i class="fa fa-pencil" onclick="statuz.announcement_edit(' + action.aid + ')"></i> ';
            if (begun) {
                row += '<i class="fa fa-stop"  onclick="statuz.announcement_stop(' + action.aid + ')"></i>';
            } else {
                row += '<i class="fa fa-trash"  onclick="statuz.announcement_delete(' + action.aid + ')"></i>';
            }
            row += '</td>';
            row += "</tr>";
            announcements_table.append(row);
        });
        if (o.actions.length == 0) {
            var row = '<tr><td colspan="6">no current or upcoming announcements</td></tr>';
            announcements_table.append(row);
        }
        $("#announcement_box").removeClass("loading");
    })
};

statuz.update = function() {
    console.log("updating");
    $("#loading").css("visibility", "visible");
    $("#status_box, #status_change_box, #announcement_box, #log_box").addClass("loading");

    var requests = [
        statuz.update_status(),
        statuz.update_log(),
        statuz.update_presence(),
        statuz.update_announcements()
    ];
    $.when.apply($, requests).then(function() {
        $("#loading").css("visibility", "hidden");
    });

    $.when.apply($, [requests[0], requests[2]]).then(function() {
        $("#status_box").removeClass("loading");
    });
};

var status_change = function(status) {
    $("#status_change_box").css("visibility", "hidden");
    var user = $("#username").val();
    if (user == "") {
        user = "Hans Acker";
    }
    var note = $("#status_change_note").val();
    $.ajax(api + "/v0", {
        data: JSON.stringify({
            type: "status",
            user: user,
            status: status,
            note: note
        }),
        method: "PUT",
        success: function(res, status, jqxhr) {
            statuz.update();
            $("#status_change_box").css("visibility", "visible");
        }
    });
};

var parse_dates = function(from_str, to_str) {
    from_str = from_str.trim();
    to_str   = to_str.trim();
    var from_date_included = from_str.indexOf(" ") > -1;
    var to_date_included   = to_str.indexOf(" ") > -1;
    var formats = [
        "H",
        "H:mm",
        "D.M. H:mm",
        "D.M.YY H:mm",
        "D.M.YYYY H:mm",
        "YYYY-M-D H:mm"
    ];
    var now  = moment();
    if (from_str == "now" || from_str == "") {
        var from = moment();
    } else {
        var from = moment(from_str, formats);
    }
    if (to_str == "now" || to_str == "") {
        var to = moment();
    } else {
        var to   = moment(to_str  , formats);
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
    from_ret = parseInt(from.format("X"), 10),
    to_ret   = parseInt(to.format("X")  , 10)
    if (from_str == "now" || from_str == "") {
        var from_ret = "now";
    }
    if (to_str == "now" || to_str == "") {
        var to_ret = "now";
    }
    return [from_ret, to_ret];
}

var announcement_add = function() {
    $("#announcement_add_box").css("visibility", "hidden");
    var user = $("#username").val();
    if (user == "") {
        user = "Hans Acker";
    }
    var note = $("#announcement_add_note").val();
    var time_range = parse_dates($("#announcement_add_from").val(), $("#announcement_add_to").val());
    var public_ = $("#announcement_add_public").prop("checked");
    $.ajax(api + "/v0", {
        data: JSON.stringify({
            type: "announcement",
            method: "new",
            user: user,
            from: time_range[0],
            to: time_range[1],
            public: public_,
            note: note
        }),
        method: "PUT",
        success: function(res, status, jqxhr) {
            statuz.update();
            $("#announcement_add_box input[type=text]").val("");
            $("#announcement_add_public").prop("checked", false);
            $("#announcement_add_box").css("visibility", "visible");
        }
    });
};

var announcement_modify = function() {
    $("#announcement_modify_box").hide();
    var user = $("#username").val();
    if (user == "") {
        user = "Hans Acker";
    }
    var note = $("#announcement_modify_note").val();
    var time_range = parse_dates($("#announcement_modify_from").val(), $("#announcement_modify_to").val());
    var aid = parseInt($("#announcement_modify_aid").val(), 10);
    var public_ = $("#announcement_modify_public").prop("checked");
    $.ajax(api + "/v0", {
        data: JSON.stringify({
            type: "announcement",
            method: "mod",
            aid: aid,
            user: user,
            from: time_range[0],
            to: time_range[1],
            public: public_,
            note: note
        }),
        method: "PUT",
        success: function(res, status, jqxhr) {
            statuz.update();
        }
    });
};

// debug:
$("#header h1").click(function() { statuz.update() });

$("#status_change_public" ).click(function(ev) { status_change("public" ); });
$("#status_change_private").click(function(ev) { status_change("private"); });
$("#status_change_closed" ).click(function(ev) { status_change("closed" ); });

$("#status_change_note_clear").click(function(ev) {
    $("#status_change_note").val("");
});

$("#announcement_add_submit").click(function(ev) { announcement_add() });
$("#announcement_modify_submit").click(function(ev) { announcement_modify() });
$("#announcement_modify_cancel").click(function(ev) {
    $("#announcement_modify_box").slideUp();
});

var linkToLocalStorage = function(key, inputElem) {
    var inputElem = $(inputElem);
    inputElem.val(localStorage.getItem(key));
    inputElem.focusout(function() {
        localStorage.setItem(key, inputElem.val());
    });
};
var linkToLocalStorageCheckbox = function(key, inputElem) {
    var inputElem = $(inputElem);
    inputElem.prop("checked", JSON.parse(localStorage.getItem(key)));
    inputElem.change(function() {
        localStorage.setItem(key, inputElem.prop("checked"));
    });
};

linkToLocalStorage("username", "#username");
linkToLocalStorageCheckbox("auto_refresh", "#auto_refresh");

var auto_refresher;
var update_auto_refresh = function() {
    clearInterval(auto_refresher);
    if (JSON.parse(localStorage.getItem("auto_refresh"))) {
        auto_refresher = setInterval(statuz.update, 5*60*1000);
    }
};
$("#auto_refresh").change(update_auto_refresh);
update_auto_refresh();

var toggleFullScreen = function() {
    if (!document.fullscreenElement &&    // alternative standard method
            !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {  // current working methods
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}
$("#fullscreen").click(toggleFullScreen);

statuz.update();
});
