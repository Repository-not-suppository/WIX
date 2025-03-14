import wixLocation from 'wix-location';
import wixData from 'wix-data';
import { memory } from 'wix-storage';

$w.onReady(async function () {
    console.log("🚀 Page 2 loaded.");
    $w('#errorMessage').hide();

    // Retrieve stored First & Last Name
    let storedFirstName = memory.getItem("firstName") || "";
    let storedLastName = memory.getItem("lastName") || "";

    // Determine if Next Button should be enabled at start
    if (storedFirstName && storedLastName) {
        console.log("✅ Stored values detected. Enabling Next Button.");
        $w('#nextButton').enable();
    } else {
        console.log("⚠️ No stored values. Disabling Next Button.");
        $w('#nextButton').disable();
    }

    // Set input values if memory values exist
    $w('#firstNameInput').value = storedFirstName;
    $w('#lastNameInput').value = storedLastName;

    // Enable Next Button when user clicks any input field
    $w('#firstNameInput, #lastNameInput').onClick(() => {
        console.log("📌 Input field clicked. Enabling Next Button.");
        $w('#nextButton').enable();
    });

    // Validate input on user typing
    $w('#firstNameInput').onInput(() => {
        memory.setItem("firstName", $w('#firstNameInput').value.trim());
    });

    $w('#lastNameInput').onInput(() => {
        memory.setItem("lastName", $w('#lastNameInput').value.trim());
    });

    function showError(message) {
        console.error("❌ ERROR:", message);
        $w('#errorMessage').text = message;
        $w('#errorMessage').show();
    }

    function hideError() {
        $w('#errorMessage').hide();
    }

    async function submitDataAndNavigate(destination) {
        const firstName = $w('#firstNameInput').value.trim();
        const lastName = $w('#lastNameInput').value.trim();

        if (firstName === "" || lastName === "") {
            showError("Error: Both First Name and Last Name are required.");
            return;
        }

        console.log("📩 Saving First & Last Name:", firstName, lastName);
        memory.setItem("firstName", firstName);
        memory.setItem("lastName", lastName);

        try {
            let existingRecord = await wixData.query("LandingPageUserSubmissions")
                .eq("trustName", memory.getItem("trustName"))
                .find();

            if (existingRecord.items.length > 0) {
                let existingId = existingRecord.items[0]._id;
                let updatedData = {
                    _id: existingId,
                    firstName,
                    lastName,
                    ...existingRecord.items[0]
                };

                console.log("🔄 Updating existing record:", updatedData);
                await wixData.update("LandingPageUserSubmissions", updatedData);

                console.log("✅ Data saved. Navigating to:", destination);
                await new Promise(resolve => setTimeout(resolve, 300)); // Ensures DB updates complete
                wixLocation.to(destination);
            } else {
                console.error("❌ ERROR: No existing record found.");
                showError("Error: Data inconsistency detected. Please restart the process.");

                await wixData.insert("LandingPageUserSubmissions", {
                    trustName: memory.getItem("trustName"),
                    errorLog: "ERROR: No existing row found on Page 2."
                });
            }
        } catch (error) {
            let errorMessage = `Database error: ${error.message}`;
            showError(errorMessage);

            // Log error in database
            try {
                let existingRecord = await wixData.query("LandingPageUserSubmissions")
                    .eq("trustName", memory.getItem("trustName"))
                    .find();

                if (existingRecord.items.length > 0) {
                    let existingId = existingRecord.items[0]._id;
                    await wixData.update("LandingPageUserSubmissions", {
                        _id: existingId,
                        errorLog: errorMessage
                    });
                } else {
                    await wixData.insert("LandingPageUserSubmissions", {
                        trustName: memory.getItem("trustName"),
                        errorLog: errorMessage
                    });
                }
            } catch (logError) {
                console.error("❌ Failed to log error in database:", logError.message);
            }
        }
    }

    // ✅ Next and Back buttons now use the same logic, only page destination changes
    $w('#nextButton').onClick(() => submitDataAndNavigate("/signup-Zba2"));
    $w('#backButton').onClick(() => submitDataAndNavigate("/signup-Zba"));
});
