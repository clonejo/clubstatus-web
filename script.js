"use strict";
$(document).ready(function() {

var api = "/api";

// am/pm -> 24h and short fromNow
moment.locale('en-24h', {
    longDateFormat: {
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
                row += '<td colspan="4" class="note">';
                if (action.note != "") {
                    row += '“' + $("<div/>").text(action.note).html() + "”";
                }
                row += '</td>';
                row += "</tr>";
                log_table.prepend(row);
            }
        });
    });
}

var status_change = function(status) {
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
        }
    });
}

$("#status_change_public" ).click(function(ev) { status_change("public" ); });
$("#status_change_private").click(function(ev) { status_change("private"); });
$("#status_change_closed" ).click(function(ev) { status_change("closed" ); });

$("#status_change_note_clear").click(function(ev) {
    $("#status_change_note").val("");
});

$("#username").val(localStorage.getItem("username"));
$("#username").focusout(function() {
    localStorage.setItem("username", $("#username").val());
});

update();
//setInterval(update, 1000);
});
