import * as lineService from "../services/lineService.js";
import { trackEvent } from "../services/analyticsService.js";

/**
 * LINE Webhook Controller
 * Receives validated webhook events from the LINE Platform.
 */
export const webhook = async (req, res, next) => {
	// The line.middleware has already validated the signature and parsed the events.
	const events = req.body.events;

	try {
		// Process all events concurrently.
		const result = await Promise.all(events.map(handleEvent));
		res.json(result);
	} catch (error) {
		console.error("Failed to process LINE webhook events:", error);
		// It's good practice to also log the error details if available.
		if (error.originalError) {
			console.error("LINE SDK Original Error:", error.originalError.response.data);
		}
		res.status(500).end();
	}
};

const handleEvent = async (event) => {
	const { userId } = event.source;

	if (event.type === "unfollow") {
		trackEvent(userId, "unfollow_bot");
		return lineService.handleUnfollow(event);
	}

	if (event.type === "follow") {
		trackEvent(userId, "follow_bot");
		return lineService.handleFollow(event);
	}

	if (event.type === "message" && event.message.type === "text") {
		trackEvent(userId, "receive_text_message", {
			message_length: event.message.text.length,
			message_text: event.message.text
		});
		return lineService.handleMessage(event);
	}

	if (event.type === "postback") {
		trackEvent(userId, "postback_received", {
			postback_data: event.postback.data
		});
		return lineService.handlePostback(event);
	}

	return Promise.resolve(null);
};
