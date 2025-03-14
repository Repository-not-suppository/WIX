import wixLocation from 'wix-location';
import wixData from 'wix-data';
import { memory } from 'wix-storage';

$w.onReady(async function () {
    console.log("🚀 Page 2 loaded.");
    $w('#nextButton').disable();
    $w('#errorMessage').hide();

    // Retrieve Trust Name from Memory (Must exist from Page 1)
    let trustName = memory.getItem("trustName");
    if (!trustName) {
        console.error("❌ Trust Name missing from memory.");
        return;
    }
    console.log("✅ Trust Name retrieved:", trustName);

    // Retrieve stored First & Last Name
    let storedFirstName = memory.getItem("firstName") || "";
    let storedLastName = memory.getItem("lastName") || "";

    // Fetch existing data from database
    let existingRecord;
    try {
        let queryResult = await wixData.query("LandingPageUserSubmissions")
            .eq("trustName", trustName) // Fetch the correct row
            .find();

        if (queryResult.items.length > 0) {
            existingRecord = queryResult.items[0];
            console.log("✅ Existing record found:", existingRecord);

            // Auto-fill input fields but prioritize memory storage
            if (!storedFirstName && existingRecord.firstName) {
                storedFirstName = existingRecord.firstName;
                memory.setItem("firstName", existingRecord.firstName);
            }
            if (!storedLastName && existingRecord.lastName) {
                storedLastName = existingRecord.lastName;
                memory.setItem("lastName", existingRecord.lastName);
            }
        } else {
            console.error("❌ ERROR: No existing record found for Trust Name:", trustName);
        }
    } catch (error) {
        console.error("❌ Database Query Error:", error.message);
    }

    // Set values in the fields and validate them
    $w('#firstNameInput').value = storedFirstName;
    $w('#lastNameInput').value = storedLastName;
    validateFields();

    // Enable Next Button if fields are already filled
    function validateFields() {
        const firstName = $w('#firstNameInput').value.trim();
        const lastName = $w('#lastNameInput').value.trim();

        if (firstName !== "" && lastName !== "") {
            console.log("✅ Inputs detected. Enabling Next Button.");
            $w('#nextButton').enable();
        } else {
            console.log("⚠️ Inputs missing. Disabling Next Button.");
            $w('#nextButton').disable();
        }
    }

    $w('#firstNameInput').onInput(() => {
        memory.setItem("firstName", $w('#firstNameInput').value.trim());
        validateFields();
    });

    $w('#lastNameInput').onInput(() => {
        memory.setItem("lastName", $w('#lastNameInput').value.trim());
        validateFields();
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
                .eq("trustName", trustName) // Ensure we get the correct row
                .find();

            if (existingRecord.items.length > 0) {
                let existingId = existingRecord.items[0]._id;
                let updatedData = {
                    _id: existingId,
                    trustName, // Preserve trust name
                    firstName,
                    lastName,
                    // Preserve other fields to prevent data loss
                    ...existingRecord.items[0]
                };

                console.log("🔄 Updating existing record:", updatedData);
                await wixData.update("LandingPageUserSubmissions", updatedData);

                console.log("✅ Data saved. Navigating to:", destination);
                await new Promise(resolve => setTimeout(resolve, 300)); // Short delay ensures DB updates complete
                wixLocation.to(destination);
            } else {
                console.error("❌ ERROR: No existing record found for Trust Name:", trustName);
                showError("Error: Data inconsistency detected. Please restart the process.");

                // Log issue in errorLog field
                await wixData.insert("LandingPageUserSubmissions", {
                    trustName,
                    errorLog: "ERROR: No existing row found on Page 2."
                });
            }
        } catch (error) {
            let errorMessage = `Database error: ${error.message}`;
            showError(errorMessage);

            // Log error in the database
            try {
                let existingRecord = await wixData.query("LandingPageUserSubmissions")
                    .eq("trustName", trustName)
                    .find();

                if (existingRecord.items.length > 0) {
                    let existingId = existingRecord.items[0]._id;
                    await wixData.update("LandingPageUserSubmissions", {
                        _id: existingId,
                        errorLog: errorMessage
                    });
                    console.log("📝 Error logged in existing entry.");
                } else {
                    await wixData.insert("LandingPageUserSubmissions", {
                        trustName,
                        errorLog: errorMessage
                    });
                    console.log("📝 Error logged as new entry.");
                }
            } catch (logError) {
                console.error("❌ Failed to log error in database:", logError.message);
            }
        }
    }

    $w('#nextButton').onClick(() => submitDataAndNavigate("/signup-Zba2"));
    $w('#backButton').onClick(() => submitDataAndNavigate("/signup-Zba"));
});
