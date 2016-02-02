"use strict";
$(document).ready(function() {

var api = "/api";

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

var update = function() {
    console.log("updating");

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
        var updated = moment.unix(o.last.time)
            $("#current_status_changed").text(changed.calendar() + " by " + o.changed.user + " (" + changed.fromNow(true) + ")");
        $("#current_status_updated").text(updated.calendar() + " by " + o.last.user + " (" + updated.fromNow(true) + ")");
    });

    $.getJSON(api + "/v0/all", function(o) {
        var log_table = $("#log tbody");
        log_table.empty();
        $.each(o.actions, function(index, action) {
            if (action.type == "status") {
                var row = '<tr>';
                row += "<td>" + action.id + "</td>";
                row += "<td>" + moment.unix(action.time).format("ddd, YYYY-MM-DD, LT") + "</td>";
                row += '<td><span class="status status_' + action.status + '">' + action.status + "</span></td>";
                row += "<td>by " + action.user + "</td>";
                row += '<td class="note">';
                if (action.note != "") {
                    row += '“' + $("<div/>").text(action.note).html() + "”";
                }
                row += '</td>';
                row += "</tr>";
                log_table.prepend(row);
            }
        });
    });

    $.getJSON(api + "/v0/announcement/current", function(o) {
        var announcements_table = $("#announcements tbody");
        announcements_table.empty();
        $.each(o.actions, function(index, action) {
            var calendarFormats = {
                sameElse: "ddd, YYYY-MM-DD, LT"
            };
            var from = moment.unix(action.from);
            var to = moment.unix(action.to);
            if (from.isAfter()) {
                var row = '<tr>';
            } else {
                var row = '<tr class="begun">';
            }
            row += "<td>" + action.id + "</td>";
            row += '<td>';
            if (!from.isAfter()) {
                row += '<i class="fa fa-play"></i> ';
            }
            row += from.calendar(null, calendarFormats) + "</td>";
            row += "<td>" + to.calendar(null, calendarFormats) + "</td>";
            row += "<td>by " + action.user + "</td>";
            row += '<td class="note">';
            if (action.note != "") {
                row += '“' + $("<div/>").text(action.note).html() + "”";
            }
            row += '</td>';
            if (action.public) {
                row += "<td>✔</td>";
            }{
                row += "<td>&nbsp;</td>";
            }
            row += "</tr>";
            announcements_table.append(row);
        });
        if (o.actions.length == 0) {
            var row = '<tr><td colspan="6">no current or upcoming announcements</td></tr>';
            announcements_table.append(row);
        }
    });
}

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
            update();
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
    return [
        parseInt(from.format("X"), 10),
        parseInt(to.format("X")  , 10)
    ];
}

var announcement_add = function() {
    $("#announcement_add_box").css("visibility", "hidden");
    var user = $("#username").val();
    if (user == "") {
        user = "Hans Acker";
    }
    var note = $("#announcement_add_note").val();
    var time_range = parse_dates($("#announcement_add_from").val(), $("#announcement_add_to").val());
    $.ajax(api + "/v0", {
        data: JSON.stringify({
            type: "announcement",
            method: "new",
            user: user,
            from: time_range[0],
            to: time_range[1],
            note: note
        }),
        method: "PUT",
        success: function(res, status, jqxhr) {
            update();
            $("#announcement_add_box input[type=text]").val("");
            $("#announcement_add_box").css("visibility", "visible");
        }
    });
};

$("#status_change_public" ).click(function(ev) { status_change("public" ); });
$("#status_change_private").click(function(ev) { status_change("private"); });
$("#status_change_closed" ).click(function(ev) { status_change("closed" ); });

$("#status_change_note_clear").click(function(ev) {
    $("#status_change_note").val("");
});

$("#announcement_add_submit").click(function(ev) { announcement_add() });

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
        auto_refresher = setInterval(update, 5*60*1000);
    }
};
$("#auto_refresh").change(update_auto_refresh);
update_auto_refresh();

update();
//setInterval(update, 1000);
});
