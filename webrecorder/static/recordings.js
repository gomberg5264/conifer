var user = "@anon"
var coll = "anonymous"

if (window.wbinfo) {
    user = window.wbinfo.info.user;
    coll = window.wbinfo.info.coll_id;
} else if (window.curr_user) {
    user = window.curr_user;
}

$(function() {
    // 'New recording': Record button
    $('header').on('submit', '.start-recording', function(event) {
        event.preventDefault();

        var collection = $("*[name='collection']").val();
        var title = $("input[name='title']").val();
        var url = $("input[name='url']").val();

        RouteTo.recordingInProgress(user, collection, title, url);
    });

    // 'Recording in progress': Url bar 'Go' button / enter key
    $('header').on('submit', '.recording-in-progress', function(event) {
        event.preventDefault();

        var url = $("input[name='url']").val();

        RouteTo.recordingInProgress(user, coll, wbinfo.info.rec_id, url);
    });

    // 'Recording in progress': Stop recording button
    $('header').on('submit', '.stop-recording', function(event) {
        event.preventDefault();

        RouteTo.recordingInfo(user, coll, wbinfo.info.rec_id);
    });

    // 'Browse recording': Url bar 'Go' button / enter key
    $('header').on('submit', '.browse-recording', function(event) {
        event.preventDefault();

        var url = $("input[name='url']").val();

        RouteTo.browseRecording(user, coll, wbinfo.info.rec_id, url);
    });

    // 'Browse recording': 'Add to recording' button
    $('header').on('submit', '.add-to-recording', function(event){
        event.preventDefault();

        var url = $("input[name='url']").val();

        RouteTo.recordingInProgress(user, coll, wbinfo.info.rec_id, url);
    });

    CollectionsDropdown.start();
    RecordingSizeWidget.start();
    PagesComboxBox.start();
});

var Collections = (function() {
    var API_ENDPOINT = "/api/v1/collections";

    var get = function(doneCallback, failCallback) {
        var query_string = "?user=" + user

        $.ajax({
            url: API_ENDPOINT + query_string,
            method: "GET"
        })
        .done(function(data, textStatus, xhr) {
            doneCallback(data);
        })
        .fail(function(xhr, textStatus, errorThrown) {
            failCallback();
        });
    }

    return {
        get: get
    }
})();

var Recordings = (function() {
    var API_ENDPOINT = "/api/v1/recordings";
    var query_string = "?user=" + user + "&coll=" + coll;

    var get = function(recordingId, doneCallback, failCallback) {
        $.ajax({
            url: API_ENDPOINT + "/" + recordingId + query_string,
            method: "GET",
        })
        .done(function(data, textStatus, xhr) {
            doneCallback(data);
        })
        .fail(function(xhr, textStatus, errorThrown) {
            failCallback();
        });

    }

    var addPage = function(recordingId, attributes) {
        var attributes = attributes;
        $.ajax({
            url: API_ENDPOINT + "/" + recordingId + "/pages" + query_string,
            method: "POST",
            data: attributes
        })
        .done(function(data, textStatus, xhr){
            $("input[name='url']").val(attributes.url);
        })
        .fail(function(xhr, textStatus, errorThrown) {
            // Fail gracefully when the page can't be updated
        });
    }

    var getPages = function(recordingId, doneCallback, failCallback) {
        // no recordingId if in collection replay mode
        // skipping for now, possible to get pages for all recordings
        if (!recordingId) {
            failCallback();
            return;
        }

        $.ajax({
            url: API_ENDPOINT + "/" + recordingId + "/pages" + query_string,
            method: "GET",
        })
        .done(function(data, textStatus, xhr){
            doneCallback(data);
        })
        .fail(function(xhr, textStatus, errorThrown) {
            failCallback();
        });
    }

    return {
        get: get,
        addPage: addPage,
        getPages: getPages
    }
}());

var RouteTo = (function(){
    var host = window.location.protocol + "//" + window.location.host;

    var recordingInProgress = function(user, collection, recording, url) {
        if (user == "@anon") {
            routeTo(host + "/" + collection + "/" + recording + "/record/" + url);
        } else {
            routeTo(host + "/" + user + "/" + collection + "/" + recording + "/record/" + url);
        }
    }

    var collectionInfo = function(user, collection) {
        if (user == "@anon") {
            routeTo(host + "/anonymous");
        } else {
            routeTo(host + "/" + user + "/" + collection);
        }
    }

    var recordingInfo = function(user, collection, recording) {
        if (user == "@anon") {
            routeTo(host + "/" + collection + "/" + recording);
        } else {
            routeTo(host + "/" + user + "/" + collection + "/" + recording);
        }
    }

    var browseRecording = function(user, collection, recording, url) {
        if (user == "@anon") {
            routeTo(host + "/" + collection + "/" + recording + "/" + url);
        } else {
            routeTo(host + "/" + user + "/" + collection + "/" + recording + "/" + url);
        }
    }

    var routeTo = function(url) {
        window.location.href = url;
    }

    return {
        recordingInProgress: recordingInProgress,
        collectionInfo: collectionInfo,
        recordingInfo: recordingInfo,
        browseRecording: browseRecording
    }
}());

var RecordingSizeWidget = (function() {
    var start = function() {
        if ($('.size-counter').length) {
            var spaceUsed = format_bytes(wbinfo.info.size);
            updateDom(spaceUsed);

            if (wbinfo.state == "record") {
                setInterval(pollForSizeUpdate, 10000);
            }
        }
    }

    var pollForSizeUpdate = function() {
        Recordings.get(wbinfo.info.rec_id, updateSizeCounter, hideSizeCounter)
    }

    var updateSizeCounter = function(data) {
        var spaceUsed = format_bytes(data.recording.size);

        updateDom(spaceUsed);
    }

    var updateDom = function(spaceUsed) {
        $('.size-counter .current-size').text(spaceUsed);
        $('.size-counter').removeClass('hidden');
    }

    var hideSizeCounter = function() {
        $('.size-counter').addClass('hidden');
    }

    return {
        start: start
    }

})();

var PagesComboxBox = (function() {
    var start = function() {
        if ($(".browse-recording .url").length) {
            Recordings.getPages(wbinfo.info.rec_id, initializeCombobox, dontInitializeCombobox);
        }
    }

    // From typeahead examples
    var substringMatcher = function(pages) {
        return function findMatches(q, cb) {
            var matches, substringRegex;

            // an array that will be populated with substring matches
            matches = [];

            // regex used to determine if a string contains the substring `q`
            substrRegex = new RegExp(q, 'i');

            // iterate through the pool of strings and for any string that
            // contains the substring `q`, add it to the `matches` array
            $.each(pages, function(i, page) {
                if (substrRegex.test(page.url)) {
                    matches.push(page);
                }
            });

            cb(matches);
        };
    };

    var initializeCombobox = function(data) {
        var pages = data.pages;

        //        var source = new Bloodhound({
        //            datumTokenizer: function(pages) {
        //                return Bloodhound.tokenizers.whitespace(pages.url);
        //            },
        //            queryTokenizer: Bloodhound.tokenizers.whitespace,
        //            local: pages
        //        });

        var source = substringMatcher(pages);

        $("input[name='url']").typeahead(
            {
                highlight: true,
                minLength: 0,
                hint: true,
            },
            {
                name: 'pages',
                source: source,
                limit: 1000000,

                display: "url",
                templates: {
                    suggestion: function(data) {
                        return "<div>" + data.url +
                            "<span class='suggestion-timestamp pull-right'>"
                        + ts_to_date(data.timestamp) + "</span></div>";
                    }
                }
            });
    }

    var dontInitializeCombobox = function() {
        // If we can't load this recording's pages,
        // do nothing to leave this as a regular
        // input field
    }

    return {
        start: start
    }
})();

var CollectionsDropdown = (function() {

    var start = function() {
        // Only activate when logged in and not in record/browse mode
        if (!window.curr_user || user == "@anon" || window.wbinfo) {
            return;
        }

        Collections.get(initializeDropdown, dontInitializeDropdown);
    }

    var initializeDropdown = function(data) {
        if (!data.collections || !data.collections.length) {
            return;
        }
        //console.log('got some collections woo!');
        var collectionInputParentDiv = $("input[name='collection']").parent();
        var collectionOptions = $.map(data.collections, function(collection) {
            return $("<option value='" + collection.id + "'>" + collection.title + "</option>");
        })

        $(collectionInputParentDiv).html($("<select name='collection'>").append(collectionOptions));

        $("select", collectionInputParentDiv).selectBoxIt({native: false});

    }

    var dontInitializeDropdown = function() {
        //console.log("*SOB!*");
        // If we can't load this user's collections, just
        // leave this as an input field
    }

    return {
        start: start
    }
})();


// Format size
$(function() {
    $("[data-size]").each(function(i, elem) {
        $(elem).text(format_bytes($(elem).attr("data-size")));
    });
});


// Utils
//From http://stackoverflow.com/questions/4498866/actual-numbers-to-the-human-readable-values
function format_bytes(bytes) {
    if (!isFinite(bytes) || (bytes < 1)) {
        return "0 bytes";
    }
    var s = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    var e = Math.floor(Math.log(bytes) / Math.log(1000));
    return (bytes / Math.pow(1000, e)).toFixed(2) + " " + s[e];
}


function ts_to_date(ts, is_gmt)
{
    if (!ts) {
        return "";
    }

    if (ts.length < 14) {
        ts += "00000000000000".substr(ts.length);
    }

    var datestr = (ts.substring(0, 4) + "-" +
                  ts.substring(4, 6) + "-" +
                  ts.substring(6, 8) + "T" +
                  ts.substring(8, 10) + ":" +
                  ts.substring(10, 12) + ":" +
                  ts.substring(12, 14) + "-00:00");

    var date = new Date(datestr);
    if (is_gmt) {
        return date.toGMTString();
    } else {
        return date.toLocaleString();
    }
}





var _orig_set_state = window.set_state;

window.set_state = function(state) {
    _orig_set_state(state);

    if (wbinfo.state == "record") {
        var recordingId = wbinfo.info.rec_id;
        var attributes = {};

        attributes.url = state.url;
        attributes.timestamp = state.timestamp;
        attributes.title = $('iframe').contents().find('title').text();

        Recordings.addPage(recordingId, attributes);
    } else if (wbinfo.state == "replay" || wbinfo.state == "replay-coll") {
        $("input[name='url']").val(state.url);
    }
};
