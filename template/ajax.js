/* global phpbb */

(function($) {  // Avoid conflicts with other libraries

'use strict';

// This callback will mark all forum icons read
phpbb.addAjaxCallback('mark_forums_read', function(res) {
	$('a.forum-icon').removeClass('btn-warning').addClass('btn-default');

	// Mark topics read if we are watching a category and showing active topics
	if ($('#active_topics').length) {
		phpbb.ajaxCallbacks.mark_topics_read.call(this, res, false);
	}
	phpbb.closeDarkenWrapper(3000);
});

/** 
* This callback will mark all topic icons read
*
* @param update_topic_links bool Whether "Mark topics read" links should be
*     updated. Defaults to true.
*/
phpbb.addAjaxCallback('mark_topics_read', function(res, updateTopicLinks) {
	$('a.topic-icon').removeClass('btn-warning').addClass('btn-default');
	phpbb.closeDarkenWrapper(3000);
});

// This callback will mark all notifications read
phpbb.addAjaxCallback('notification.mark_all_read', function(res) {
	if (typeof res.success !== 'undefined') {
		phpbb.markNotifications($('#notification_list'), 0);
	//	phpbb.closeDarkenWrapper(3000);
	}
});

// This callback will mark a notification read
phpbb.addAjaxCallback('notification.mark_read', function(res) {
	if (typeof res.success !== 'undefined') {
		var unreadCount = Number($('#notification_list_button strong').html()) - 1;
		phpbb.markNotifications($(this).parent('li'), unreadCount);
		phpbb.closeDarkenWrapper(3000);
	}
});

/**
 * Mark notification popup rows as read.
 *
 * @param {jQuery} $popup jQuery object(s) to mark read.
 * @param {int} unreadCount The new unread notifications count.
 */
phpbb.markNotifications = function($popup, unreadCount) {
	// Remove the unread status.
	$popup.find('a.bg-warning').removeClass('bg-warning');
	$popup.find('a.mark_read').remove();

	// Update the notification link to the real URL.
	$popup.each(function() {
		var link = $(this).find('a');
		link.attr('href', link.attr('data-real-url'));
	});

	// Update the unread count.
	$('strong', '#notification_list_button').html(unreadCount);
	// Remove the Mark all read link if there are no unread notifications.
	if (!unreadCount) {
		$('#mark_all_notifications').remove();
		$('#notification_list_button').removeClass('btn-warning');
		$('#notification_list_button i').removeClass('fa-bell');
		$('#notification_list_button').addClass('btn-default');
		$('#notification_list_button i').addClass('fa-bell-slash');
	}

	// Update page title
	$('title').text(
		(unreadCount ? '(' + unreadCount + ')' : '') + $('title').text().replace(/(\(([0-9])\))/, '')
	);

};

// This callback finds the post from the delete link, and removes it.
phpbb.addAjaxCallback('post_delete', function() {
	var $this = $(this),
		postId;

	if ($this.attr('data-refresh') === undefined) {
		postId = $this[0].href.split('&p=')[1];
		var post = $this.parents('#p' + postId).css('pointer-events', 'none');
		if (post.hasClass('bg1') || post.hasClass('bg2')) {
			var posts1 = post.nextAll('.bg1');
			post.nextAll('.bg2').removeClass('bg2').addClass('bg1');
			posts1.removeClass('bg1').addClass('bg2');
		}
		post.fadeOut(function() {
			$(this).remove();
		});
	}
});

// This callback removes the approve / disapprove div or link.
phpbb.addAjaxCallback('post_visibility', function(res) {
	var remove = (res.visible) ? $(this) : $(this).parents('.post');
	$(remove).css('pointer-events', 'none').fadeOut(function() {
		$(this).remove();
	});

	if (res.visible) {
		// Remove the "Deleted by" message from the post on restoring.
		remove.parents('.post').find('.post_deleted_msg').css('pointer-events', 'none').fadeOut(function() {
			$(this).remove();
		});
	}
});

// This removes the parent row of the link or form that fired the callback.
phpbb.addAjaxCallback('row_delete', function() {
	$(this).parents('tr').remove();
});

// This handles friend / foe additions removals.
phpbb.addAjaxCallback('zebra', function(res) {
	var zebra;

	if (res.success) {
		zebra = $('.zebra');
		zebra.first().html(res.MESSAGE_TEXT);
		zebra.not(':first').html('&nbsp;').prev().html('&nbsp;');
	}
});

/**
 * This callback updates the poll results after voting.
 */
phpbb.addAjaxCallback('vote_poll', function(res) {
	if (typeof res.success !== 'undefined') {
		var poll = $('.topic_poll');
		var panel = poll.find('.panel');
		var resultsVisible = poll.find('dl:first-child .resultbar').is(':visible');
		var mostVotes = 0;

		// Set min-height to prevent the page from jumping when the content changes
		var updatePanelHeight = function (height) {
			var height = (typeof height === 'undefined') ? panel.find('.inner').outerHeight() : height;
			panel.css('min-height', height);
		};
		updatePanelHeight();

		// Remove the View results link
		if (!resultsVisible) {
			poll.find('.poll_view_results').hide(500);
		}

		if (!res.can_vote) {
			poll.find('.polls, .poll_max_votes, .poll_vote, .poll_option_select').fadeOut(500, function () {
				poll.find('.resultbar, .poll_option_percent, .poll_total_votes').show();
			});
		} else {
			// If the user can still vote, simply slide down the results
			poll.find('.resultbar, .poll_option_percent, .poll_total_votes').show(500);
		}
		
		// Get the votes count of the highest poll option
		poll.find('[data-poll-option-id]').each(function() {
			var option = $(this);
			var optionId = option.attr('data-poll-option-id');
			mostVotes = (res.vote_counts[optionId] >= mostVotes) ? res.vote_counts[optionId] : mostVotes;
		});

		// Update the total votes count
		poll.find('.poll_total_vote_cnt').html(res.total_votes);

		// Update each option
		poll.find('[data-poll-option-id]').each(function() {
			var $this = $(this);
			var optionId = $this.attr('data-poll-option-id');
			var voted = (typeof res.user_votes[optionId] !== 'undefined');
			var mostVoted = (res.vote_counts[optionId] === mostVotes);
			var percent = (!res.total_votes) ? 0 : Math.round((res.vote_counts[optionId] / res.total_votes) * 100);
			var percentRel = (mostVotes === 0) ? 0 : Math.round((res.vote_counts[optionId] / mostVotes) * 100);

			$this.toggleClass('voted', voted);
			$this.toggleClass('most-votes', mostVoted);

			// Update the bars
			var bar = $this.find('.resultbar div');
			var barTimeLapse = (res.can_vote) ? 500 : 1500;
			var newBarClass = (percent === 100) ? 'pollbar5' : 'pollbar' + (Math.floor(percent / 20) + 1);

			setTimeout(function () {
				bar.animate({width: percentRel + '%'}, 500)
					.removeClass('pollbar1 pollbar2 pollbar3 pollbar4 pollbar5')
					.addClass(newBarClass)
					.html(res.vote_counts[optionId]);

				var percentText = percent ? percent + '%' : res.NO_VOTES;
				$this.find('.poll_option_percent').html(percentText);
			}, barTimeLapse);
		});

		if (!res.can_vote) {
			poll.find('.polls').delay(400).fadeIn(500);
		}

		// Display "Your vote has been cast." message. Disappears after 5 seconds.
		var confirmationDelay = (res.can_vote) ? 300 : 900;
		poll.find('.vote-submitted').delay(confirmationDelay).slideDown(200, function() {
			if (resultsVisible) {
				updatePanelHeight();
			}

			$(this).delay(5000).fadeOut(500, function() {
				resizePanel(300);
			});
		});

		// Remove the gap resulting from removing options
		setTimeout(function() {
			resizePanel(500);
		}, 1500);

		var resizePanel = function (time) {
			var panelHeight = panel.height();
			var innerHeight = panel.find('.inner').outerHeight();

			if (panelHeight != innerHeight) {
				panel.css({'min-height': '', 'height': panelHeight})
					.animate({height: innerHeight}, time, function () {
						panel.css({'min-height': innerHeight, 'height': ''});
					});
			}
		};
	}
});

/**
 * Show poll results when clicking View results link.
 */
$('.poll_view_results a').click(function(e) {
	// Do not follow the link
	e.preventDefault();

	var $poll = $(this).parents('.topic_poll');

	$poll.find('.resultbar, .poll_option_percent, .poll_total_votes').show(500);
	$poll.find('.poll_view_results').hide(500);
});

$('[data-ajax]').each(function() {
	var $this = $(this);
	var ajax = $this.attr('data-ajax');
	var filter = $this.attr('data-filter');

	if (ajax !== 'false') {
		var fn = (ajax !== 'true') ? ajax : null;
		filter = (filter !== undefined) ? phpbb.getFunctionByName(filter) : null;

		phpbb.ajaxify({
			selector: this,
			refresh: $this.attr('data-refresh') !== undefined,
			filter: filter,
			callback: fn
		});
	}
});


/**
 * This simply appends #preview to the action of the
 * QR action when you click the Full Editor & Preview button
 */
$('#qr_full_editor').click(function() {
	$('#qr_postform').attr('action', function(i, val) {
		return val + '#preview';
	});
});


/**
 * Make the display post links to use JS
 */
$('.display_post').click(function(e) {
	// Do not follow the link
	e.preventDefault();

	var postId = $(this).attr('data-post-id');
	$('#post_content' + postId).show();
	$('#profile' + postId).show();
	$('#post_hidden' + postId).hide();
});

/**
* Toggle the member search panel in memberlist.php.
*
* If user returns to search page after viewing results the search panel is automatically displayed.
* In any case the link will toggle the display status of the search panel and link text will be
* appropriately changed based on the status of the search panel.
*/
$('#member_search').click(function () {
	var $memberlistSearch = $('#memberlist_search');

	$memberlistSearch.slideToggle('fast');
	phpbb.ajaxCallbacks.alt_text.call(this);

	// Focus on the username textbox if it's available and displayed
	if ($memberlistSearch.is(':visible')) {
		$('#username').focus();
	}
	return false;
});


})(jQuery); // Avoid conflicts with other libraries
