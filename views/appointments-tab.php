<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>
<?php
/**
 * Appointments tab.
 *
 * Working hours and the calendar connection. The whole point of the Connect
 * card is that there is no token field on it — StudioMeta owns the Google OAuth
 * app, so the owner clicks one button and never sees a credential.
 *
 * Values render from the last known config so the page is usable immediately;
 * admin.js refreshes from the backend, which is the source of truth, as soon as
 * the tab loads.
 */

$smva_appt_days = array(
	'mon' => __( 'Monday', 'studiometa-voice-ai' ),
	'tue' => __( 'Tuesday', 'studiometa-voice-ai' ),
	'wed' => __( 'Wednesday', 'studiometa-voice-ai' ),
	'thu' => __( 'Thursday', 'studiometa-voice-ai' ),
	'fri' => __( 'Friday', 'studiometa-voice-ai' ),
	'sat' => __( 'Saturday', 'studiometa-voice-ai' ),
	'sun' => __( 'Sunday', 'studiometa-voice-ai' ),
);

$smva_appt_enabled  = get_option( 'smva_booking_enabled', '0' ) === '1';
$smva_appt_timezone = get_option( 'smva_agent_timezone', 'UTC' );
?>
<div class="smva-tab-content">

	<div class="smva-section">
		<div class="smva-section-title"><?php esc_html_e( 'Appointment Booking', 'studiometa-voice-ai' ); ?></div>
		<p class="smva-section-desc">
			<?php esc_html_e( 'Let the agent book real appointments during a conversation, using the hours you set below. Works with or without a connected calendar.', 'studiometa-voice-ai' ); ?>
		</p>

		<div class="smva-card">
			<div class="smva-appt-toggle-row">
				<label class="smva-switch">
					<input type="checkbox" id="smva-booking-enabled" <?php checked( $smva_appt_enabled ); ?>>
					<span class="smva-switch-slider"></span>
				</label>
				<div>
					<div class="smva-appt-toggle-label"><?php esc_html_e( 'Enable appointment booking', 'studiometa-voice-ai' ); ?></div>
					<div class="smva-appt-toggle-hint"><?php esc_html_e( 'When off, the agent will not offer or accept appointments.', 'studiometa-voice-ai' ); ?></div>
				</div>
			</div>
		</div>
	</div>

	<div class="smva-section">
		<div class="smva-section-title"><?php esc_html_e( 'Working Hours', 'studiometa-voice-ai' ); ?></div>
		<p class="smva-section-desc">
			<?php
			printf(
				/* translators: %s: IANA timezone name, e.g. Europe/Paris */
				esc_html__( 'All times are in %s. Change it under General Settings.', 'studiometa-voice-ai' ),
				'<strong id="smva-appt-tz">' . esc_html( $smva_appt_timezone ) . '</strong>'
			);
			?>
		</p>

		<div class="smva-card">
			<div class="smva-appt-hours" id="smva-appt-hours">
				<?php foreach ( $smva_appt_days as $smva_day_key => $smva_day_label ) : ?>
					<div class="smva-appt-day" data-day="<?php echo esc_attr( $smva_day_key ); ?>">
						<label class="smva-appt-day-toggle">
							<input type="checkbox" class="smva-appt-day-open" data-day="<?php echo esc_attr( $smva_day_key ); ?>">
							<span class="smva-appt-day-name"><?php echo esc_html( $smva_day_label ); ?></span>
						</label>
						<div class="smva-appt-day-times">
							<input type="time" class="smva-appt-time smva-appt-start" data-day="<?php echo esc_attr( $smva_day_key ); ?>" value="09:00" disabled>
							<span class="smva-appt-dash">&ndash;</span>
							<input type="time" class="smva-appt-time smva-appt-end" data-day="<?php echo esc_attr( $smva_day_key ); ?>" value="17:00" disabled>
						</div>
						<div class="smva-appt-day-closed"><?php esc_html_e( 'Closed', 'studiometa-voice-ai' ); ?></div>
					</div>
				<?php endforeach; ?>
			</div>

			<div class="smva-appt-hours-actions">
				<button type="button" class="smva-btn smva-btn-ghost smva-btn-sm" id="smva-appt-copy-mon">
					<?php esc_html_e( 'Copy Monday to all days', 'studiometa-voice-ai' ); ?>
				</button>
			</div>
		</div>
	</div>

	<div class="smva-section">
		<div class="smva-section-title"><?php esc_html_e( 'Appointment Rules', 'studiometa-voice-ai' ); ?></div>

		<div class="smva-card">
			<div class="smva-appt-grid">
				<div class="smva-field">
					<label for="smva-appt-slot"><?php esc_html_e( 'Appointment length', 'studiometa-voice-ai' ); ?></label>
					<select id="smva-appt-slot">
						<option value="15"><?php esc_html_e( '15 minutes', 'studiometa-voice-ai' ); ?></option>
						<option value="20"><?php esc_html_e( '20 minutes', 'studiometa-voice-ai' ); ?></option>
						<option value="30" selected><?php esc_html_e( '30 minutes', 'studiometa-voice-ai' ); ?></option>
						<option value="45"><?php esc_html_e( '45 minutes', 'studiometa-voice-ai' ); ?></option>
						<option value="60"><?php esc_html_e( '1 hour', 'studiometa-voice-ai' ); ?></option>
						<option value="90"><?php esc_html_e( '1.5 hours', 'studiometa-voice-ai' ); ?></option>
						<option value="120"><?php esc_html_e( '2 hours', 'studiometa-voice-ai' ); ?></option>
					</select>
				</div>

				<div class="smva-field">
					<label for="smva-appt-buffer"><?php esc_html_e( 'Gap between appointments', 'studiometa-voice-ai' ); ?></label>
					<select id="smva-appt-buffer">
						<option value="0" selected><?php esc_html_e( 'None', 'studiometa-voice-ai' ); ?></option>
						<option value="5"><?php esc_html_e( '5 minutes', 'studiometa-voice-ai' ); ?></option>
						<option value="10"><?php esc_html_e( '10 minutes', 'studiometa-voice-ai' ); ?></option>
						<option value="15"><?php esc_html_e( '15 minutes', 'studiometa-voice-ai' ); ?></option>
						<option value="30"><?php esc_html_e( '30 minutes', 'studiometa-voice-ai' ); ?></option>
					</select>
				</div>

				<div class="smva-field">
					<label for="smva-appt-notice"><?php esc_html_e( 'Minimum notice', 'studiometa-voice-ai' ); ?></label>
					<select id="smva-appt-notice">
						<option value="0"><?php esc_html_e( 'None', 'studiometa-voice-ai' ); ?></option>
						<option value="60"><?php esc_html_e( '1 hour', 'studiometa-voice-ai' ); ?></option>
						<option value="120" selected><?php esc_html_e( '2 hours', 'studiometa-voice-ai' ); ?></option>
						<option value="240"><?php esc_html_e( '4 hours', 'studiometa-voice-ai' ); ?></option>
						<option value="1440"><?php esc_html_e( '1 day', 'studiometa-voice-ai' ); ?></option>
						<option value="2880"><?php esc_html_e( '2 days', 'studiometa-voice-ai' ); ?></option>
					</select>
					<div class="smva-field-hint"><?php esc_html_e( 'How soon a visitor may book from now.', 'studiometa-voice-ai' ); ?></div>
				</div>

				<div class="smva-field">
					<label for="smva-appt-horizon"><?php esc_html_e( 'Book up to', 'studiometa-voice-ai' ); ?></label>
					<select id="smva-appt-horizon">
						<option value="7"><?php esc_html_e( '1 week ahead', 'studiometa-voice-ai' ); ?></option>
						<option value="14"><?php esc_html_e( '2 weeks ahead', 'studiometa-voice-ai' ); ?></option>
						<option value="30" selected><?php esc_html_e( '1 month ahead', 'studiometa-voice-ai' ); ?></option>
						<option value="60"><?php esc_html_e( '2 months ahead', 'studiometa-voice-ai' ); ?></option>
						<option value="90"><?php esc_html_e( '3 months ahead', 'studiometa-voice-ai' ); ?></option>
					</select>
				</div>

				<div class="smva-field">
					<label for="smva-appt-meeting-type"><?php esc_html_e( 'Meeting type', 'studiometa-voice-ai' ); ?></label>
					<select id="smva-appt-meeting-type">
						<option value="phone" selected><?php esc_html_e( 'Phone call', 'studiometa-voice-ai' ); ?></option>
						<option value="video"><?php esc_html_e( 'Video call', 'studiometa-voice-ai' ); ?></option>
						<option value="in_person"><?php esc_html_e( 'In person', 'studiometa-voice-ai' ); ?></option>
					</select>
				</div>

				<div class="smva-field">
					<label for="smva-appt-location"><?php esc_html_e( 'Address', 'studiometa-voice-ai' ); ?></label>
					<input type="text" id="smva-appt-location" maxlength="300" placeholder="<?php esc_attr_e( 'e.g. 12 High Street, Toronto', 'studiometa-voice-ai' ); ?>">
					<div class="smva-field-hint" id="smva-appt-location-hint"></div>
				</div>

				<div class="smva-field smva-field-wide">
					<label for="smva-appt-description"><?php esc_html_e( 'Add to every appointment', 'studiometa-voice-ai' ); ?></label>
					<textarea id="smva-appt-description" rows="2" maxlength="1000" placeholder="<?php esc_attr_e( 'e.g. Please arrive 5 minutes early. Parking is behind the building.', 'studiometa-voice-ai' ); ?>"></textarea>
					<div class="smva-field-hint"><?php esc_html_e( 'Goes on the calendar event and into the confirmation email, alongside whatever the visitor told the agent.', 'studiometa-voice-ai' ); ?></div>
				</div>
			</div>

			<div class="smva-appt-save-row">
				<button type="button" class="smva-btn smva-btn-primary" id="smva-appt-save">
					<span class="smva-appt-save-label"><?php esc_html_e( 'Save Working Hours', 'studiometa-voice-ai' ); ?></span>
					<span class="smva-appt-save-spinner smva-hidden"><?php esc_html_e( 'Saving...', 'studiometa-voice-ai' ); ?></span>
				</button>
				<span id="smva-appt-msg" class="smva-int-msg"></span>
			</div>
		</div>
	</div>

	<div class="smva-section">
		<div class="smva-section-title"><?php esc_html_e( 'Calendar Sync', 'studiometa-voice-ai' ); ?></div>
		<p class="smva-section-desc">
			<?php esc_html_e( 'Connect a calendar so the agent never books over something you already have, and every appointment lands in your calendar automatically. Booking works without this.', 'studiometa-voice-ai' ); ?>
		</p>

		<div class="smva-integration-card">
			<div class="smva-int-header">
				<div class="smva-int-logo smva-int-logo-gcal">
					<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
						<rect x="3" y="4.5" width="18" height="16" rx="3" fill="#fff" stroke="#4285f4" stroke-width="1.6"/>
						<path d="M3 9h18" stroke="#4285f4" stroke-width="1.6"/>
						<path d="M8 3v3M16 3v3" stroke="#4285f4" stroke-width="1.6" stroke-linecap="round"/>
						<rect x="10.5" y="12" width="3.5" height="3.5" rx="1" fill="#34a853"/>
					</svg>
				</div>
				<div class="smva-int-grow">
					<div class="smva-int-name">
						<?php esc_html_e( 'Google Calendar', 'studiometa-voice-ai' ); ?>
						<span id="smva-gcal-badge" class="smva-hidden"></span>
					</div>
					<div class="smva-int-sub" id="smva-gcal-sub"><?php esc_html_e( 'Checking connection...', 'studiometa-voice-ai' ); ?></div>
				</div>
			</div>

			<div class="smva-int-connected-row">
				<span class="smva-int-hint" id="smva-gcal-hint"></span>
				<button type="button" class="smva-btn smva-btn-primary smva-btn-sm smva-hidden" id="smva-gcal-connect">
					<?php esc_html_e( 'Connect Google Calendar', 'studiometa-voice-ai' ); ?>
				</button>
				<button type="button" class="smva-btn smva-btn-ghost smva-btn-sm smva-hidden" id="smva-gcal-disconnect">
					<?php esc_html_e( 'Disconnect', 'studiometa-voice-ai' ); ?>
				</button>
			</div>
			<div id="smva-gcal-msg" class="smva-int-msg"></div>
		</div>

		<div class="smva-integration-card smva-int-disabled">
			<div class="smva-int-header smva-int-header-flush">
				<div class="smva-int-logo smva-int-logo-ms">
					<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
						<rect x="3" y="3" width="8.5" height="8.5" fill="#f25022"/>
						<rect x="12.5" y="3" width="8.5" height="8.5" fill="#7fba00"/>
						<rect x="3" y="12.5" width="8.5" height="8.5" fill="#00a4ef"/>
						<rect x="12.5" y="12.5" width="8.5" height="8.5" fill="#ffb900"/>
					</svg>
				</div>
				<div class="smva-int-grow">
					<div class="smva-int-name smva-int-name-muted"><?php esc_html_e( 'Outlook Calendar', 'studiometa-voice-ai' ); ?></div>
					<div class="smva-int-sub"><?php esc_html_e( 'Coming soon', 'studiometa-voice-ai' ); ?></div>
				</div>
				<span class="smva-int-badge-soon"><?php esc_html_e( 'Coming Soon', 'studiometa-voice-ai' ); ?></span>
			</div>
		</div>
	</div>

	<div class="smva-section">
		<div class="smva-section-title"><?php esc_html_e( 'Availability Preview', 'studiometa-voice-ai' ); ?></div>
		<p class="smva-section-desc">
			<?php esc_html_e( 'Exactly what the agent will offer over the next 7 days, after your hours, minimum notice and any calendar conflicts are applied.', 'studiometa-voice-ai' ); ?>
		</p>

		<div class="smva-card">
			<div class="smva-appt-preview-head">
				<span id="smva-appt-preview-summary" class="smva-hint-inline"></span>
				<button type="button" class="smva-btn smva-btn-ghost smva-btn-sm" id="smva-appt-refresh">
					<?php esc_html_e( 'Refresh', 'studiometa-voice-ai' ); ?>
				</button>
			</div>
			<div id="smva-appt-preview" class="smva-appt-preview">
				<div class="smva-appt-preview-empty"><?php esc_html_e( 'Loading...', 'studiometa-voice-ai' ); ?></div>
			</div>
		</div>
	</div>

</div><!-- .smva-tab-content -->
