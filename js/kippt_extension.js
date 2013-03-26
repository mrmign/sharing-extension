$(function() {
    var existingClipId;

    Kippt = {
        userId: null
    };

    Kippt.closePopover = function() {
        window.close();
    };

    Kippt.openTab = function(url) {
        chrome.tabs.create({url: url});
    };

    Kippt.updateLists = function(data) {
        var existingSelection = $('#id_list option:selected').val();
        
        // Clear loading
        $('#id_list').html('');
        if(data.length === 0)
        {
            $('#id_list').hide();
            $('#new_list').css('display', 'inline-block');
            $('#id_new_list').focus();
        }
        for (var i in data) {
            var list = data[i];
            $('#id_list').append(new Option(list["group_name"], list['id']));
        }
        
        $('#id_list').append('<option id="new-list-toggle">-- New list --</option>');
        $('#id_list').on('change', function(){
            if ($(this).children("option#new-list-toggle:selected").length) {
                $('#id_list').hide();
                $('#new_list').css('display', 'inline-block');
                $('#id_new_list').focus();
            }
        });
    };

    chrome.tabs.getSelected(null, function(tab) {
        // Extension
        chrome.tabs.sendRequest(tab.id, {helper: 'get_note'}, function(response) {
            if (response){
                selected_note = response.note;
            } else {
                selected_note = '';
            }

            // Kippt extension
            chrome.tabs.getSelected(null, function(tab){
                var kippt_url = 'http://www.sharing.com:8000/extension/new';
                var tab_url = tab.url;
                var tab_title = tab.title;


                $('#id_title').val(tab_title.trim());
                $('#id_url').val(tab_url);
                $('#id_notes').val(selected_note.trim());

                $('textarea').focus();

                // Get from cache
                if (localStorage.getItem('cache-title'))
                    $('#id_title').val( localStorage.getItem('cache-title') );
                if (localStorage.getItem('cache-notes'))
                    $('#id_notes').val( localStorage.getItem('cache-notes') );
            });

            if (tab.url.indexOf('chrome://') == 0) {
                // Not tab content - Open Kippt
                Kippt.openTab('http://www.sharing.com:8000');
                Kippt.closePopover();
            } else {
                // General variables
                var url = tab.url,
                    existingClipId = false;

                // Init spinner
                var opts = {
                  lines: 9,
                  length: 2,
                  width: 2,
                  radius: 3,
                  rotate: 0,
                  color: '#111',
                  speed: 1,
                  trail: 27,
                  shadow: false,
                  hwaccel: false,
                  className: 'spinner',
                  zIndex: 2e9,
                  top: 'auto',
                  left: 'auto'
                };
                var spinner = new Spinner(opts).spin();

                // Get user data
                $.ajax({
                    url: 'http://www.sharing.com:8000/extension/account',
                    type: "GET",
                    dataType: 'json'
                })
                .done(function(data){
                    Kippt.userId = data['id'];
                    localStorage.setItem('kipptUserId', data['id']);
                })
                .fail(function(jqXHR, textStatus){
                    // Logged out user, open login page
                    Kippt.openTab('http://www.sharing.com:8000/login');
                    Kippt.closePopover();
                });

                // // Fill lists from cache
                // var listCache = localStorage.getItem('kipptListCache');
                // if (listCache) {
                //     Kippt.updateLists(JSON.parse(listCache));
                // }

                // Update lists from remote
                $.getJSON(
                    'http://www.sharing.com:8000/extension/groups',
                    function(response) {
                        var responseJSON = JSON.stringify(response.objects);
                        // Update only if lists have changed
                        Kippt.updateLists(response.objects);
                        // if (responseJSON !== listCache) {
                        //     // Update UI
                        //     Kippt.updateLists(response.objects);
                        //     // Save to cache
                        //     localStorage.setItem('kipptListCache', responseJSON);
                        // }
                    }
                )

                // Handle save
                $('#submit_clip').click(function(e){
                    // Data
                    var data = {
                        url: tab.url,
                        title: $('#id_title').val(),
                        description: $('#id_notes').val(),
                        group: $('#id_list option:selected').val(),
                        new_list: false
                    };


                    // New list
                    if ($('#id_new_list').val()) {
                        data['new_list'] = true;
                        data['group_name'] = $('#id_new_list').val()
                        if ($('#id_private').is(':checked'))
                            data['is_private'] = true
                        else
                            data['is_private'] = false
                    }

                    // alert("post data to server");
                
                $.ajax({
                    url: 'http://www.sharing.com:8000/extension/new',
                    type: "POST",
                    // dataType: 'json',
                    data: data
                })
                .done(function(){
                    // Clear page cache
                    localStorage.removeItem('cache-title');
                    localStorage.removeItem('cache-notes');
                    Kippt.closePopover();

                })
                .fail(function(jqXHR, textStatus){
                    Kippt.closePopover();
                    alert( "Something went wrong when saving. Try again or contact admin");

                });
                    // Save to Kippt in background
                    // Socket.postTask(data);
                    // Kippt.closePopover();
                });

                // Cache title & notes on change
                $('#id_title').on('keyup change cut paste', function(e){
                    localStorage.setItem('cache-title', $('#id_title').val())
                });
                $('#id_notes').on('keyup change cut paste', function(e){
                    localStorage.setItem('cache-notes', $('#id_notes').val())
                });

                $(document).on("keydown", function(e){
                  if (e.which == 13 && e.metaKey) {
                    e.preventDefault();
                    $('#submit_clip').click();
                  }
                });
            }
           
        });
    });
});