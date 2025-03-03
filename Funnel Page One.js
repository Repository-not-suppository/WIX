import wixLocation from 'wix-location';
import wixData from 'wix-data';
import { memory } from 'wix-storage';

$w.onReady(async function () {
    console.log("🚀 Page 1 loaded.");
    $w('#nextButton').disable();
    $w('#errorMessage').hide();

    // Load stored Trust Name (if user returns to this page)
    let storedTrustName = memory.getItem("trustName") || "";
    if (storedTrustName) {
        console.log("✅ Loaded stored Trust Name:", storedTrustName);
        $w('#trustNameInput').value = storedTrustName;
        $w('#nextButton').enable(); // Ensure button enables when Trust Name exists
    }

    // Monitor Trust Name input
    $w('#trustNameInput').onInput(() => {
        validateTrustName();
    });

    function validateTrustName() {
        const trustName = $w('#trustNameInput').value.trim();
        if (trustName === "") {
            console.log("⚠️ Trust Name is empty. Disabling next button.");
            showError("Error: Trust Name is required.");
            $w('#nextButton').disable();
        } else {
            console.log("✅ Trust Name entered:", trustName);
            hideError();
            $w('#nextButton').enable();
        }
    }

    function showError(message) {
        console.error("❌ ERROR:", message);
        $w('#errorMessage').text = message;
        $w('#errorMessage').show();
    }

    function hideError() {
        $w('#errorMessage').hide();
    }

    async function submitDataAndNavigate(destination) {
        const trustName = $w('#trustNameInput').value.trim();
        if (trustName === "") {
            console.log("⚠️ Trust Name is empty. Preventing submission.");
            showError("Error: Trust Name is required.");
            return;
        }

        console.log("📩 Saving Trust Name:", trustName);
        memory.setItem("trustName", trustName); // Store trustName in memory

        try {
            let existingRecord = await wixData.query("LandingPageUserSubmissions")
                .eq("trustName", trustName)
                .find();

            if (existingRecord.items.length > 0) {
                let existingId = existingRecord.items[0]._id;
                console.log("🔄 Updating existing record:", existingId);

                await wixData.update("LandingPageUserSubmissions", {
                    _id: existingId,
                    trustName
                });

                console.log("✅ Trust Name updated. Navigating to:", destination);
            } else {
                console.log("🆕 Creating new Trust Name record...");
                
                await wixData.insert("LandingPageUserSubmissions", {
                    trustName
                });

                console.log("✅ New Trust Name added. Navigating to:", destination);
            }

            await new Promise(resolve => setTimeout(resolve, 300)); // Short delay ensures DB updates complete
            wixLocation.to(destination);

        } catch (error) {
            let errorMessage = `Database error: ${error.message}`;
            showError(errorMessage);

            // Log error in database
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

    // ✅ Next and Back buttons now use the same logic, only page destination changes
    $w('#nextButton').onClick(() => submitDataAndNavigate("/signup-Zba1"));
});
